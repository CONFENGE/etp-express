#!/usr/bin/env python3
"""
PageIndex Tree Builder Script

This script processes documents (PDF, TXT, MD) and generates hierarchical
tree structures using the PageIndex library.

It communicates with NestJS via JSON over stdin/stdout.

Usage:
    echo '{"action": "build", "document_path": "/path/to/doc.pdf"}' | python build_tree.py
    echo '{"action": "build_from_text", "text": "...", "document_name": "doc.txt"}' | python build_tree.py

@see Issue #1552 - [PI-1538c] Implementar TreeBuilderService com integração Python
@see https://github.com/VectifyAI/PageIndex
"""

import sys
import json
import os
import time
import asyncio
from typing import Any, Dict, Optional
from pathlib import Path

# Check if PageIndex is available
try:
    from pageindex import page_index
    from pageindex.page_index_md import md_to_tree
    from pageindex.utils import structure_to_list, get_leaf_nodes
    PAGEINDEX_AVAILABLE = True
except ImportError:
    PAGEINDEX_AVAILABLE = False


def send_response(success: bool, data: Optional[Dict] = None, error: Optional[Dict] = None):
    """Send JSON response to stdout."""
    response = {"success": success}
    if success and data is not None:
        response["data"] = data
    elif not success and error is not None:
        response["error"] = error

    print(json.dumps(response, ensure_ascii=False))
    sys.stdout.flush()


def send_error(error_type: str, message: str, details: Optional[Dict] = None):
    """Send error response."""
    error = {
        "error_type": error_type,
        "message": message,
    }
    if details:
        error["details"] = details
    send_response(False, error=error)


def count_nodes(structure: list) -> tuple:
    """Count total nodes and max depth in structure."""
    total = 0
    max_depth = 0

    def traverse(nodes: list, depth: int):
        nonlocal total, max_depth
        for node in nodes:
            total += 1
            max_depth = max(max_depth, depth)
            if "nodes" in node and node["nodes"]:
                traverse(node["nodes"], depth + 1)

    traverse(structure, 0)
    return total, max_depth


def transform_structure(pageindex_structure: list, level: int = 0) -> list:
    """Transform PageIndex structure to our TreeNode format."""
    result = []

    for idx, node in enumerate(pageindex_structure):
        transformed = {
            "id": node.get("node_id", f"node_{level}_{idx}"),
            "title": node.get("title", "Untitled"),
            "level": level,
            "pageNumbers": list(range(
                node.get("start_index", 1),
                node.get("end_index", 1) + 1
            )),
            "children": []
        }

        # Add content/summary if available
        if node.get("text"):
            transformed["content"] = node["text"]
        elif node.get("summary"):
            transformed["content"] = node["summary"]

        # Process children
        if "nodes" in node and node["nodes"]:
            transformed["children"] = transform_structure(node["nodes"], level + 1)

        result.append(transformed)

    return result


def build_tree_from_pdf(document_path: str, options: Optional[Dict] = None) -> Dict:
    """Build tree from PDF document using PageIndex."""
    if not PAGEINDEX_AVAILABLE:
        raise ImportError("PageIndex library is not installed. Run: pip install pageindex")

    if not os.path.exists(document_path):
        raise FileNotFoundError(f"Document not found: {document_path}")

    options = options or {}

    start_time = time.time()

    result = page_index(
        doc=document_path,
        model=options.get("model", "gpt-4o-2024-11-20"),
        toc_check_page_num=options.get("toc_check_page_num", 20),
        max_page_num_each_node=options.get("max_page_num_each_node", 10),
        max_token_num_each_node=options.get("max_token_num_each_node", 20000),
        if_add_node_id=options.get("if_add_node_id", "yes"),
        if_add_node_summary=options.get("if_add_node_summary", "yes"),
        if_add_doc_description=options.get("if_add_doc_description", "yes"),
        if_add_node_text=options.get("if_add_node_text", "no"),
    )

    processing_time = time.time() - start_time

    structure = result.get("structure", [])
    node_count, max_depth = count_nodes(structure)
    tree_structure = transform_structure(structure)

    return {
        "doc_name": result.get("doc_name", Path(document_path).name),
        "doc_description": result.get("doc_description"),
        "structure": tree_structure,
        "metadata": {
            "page_count": len(get_leaf_nodes(structure)) if structure else 0,
            "model": options.get("model", "gpt-4o-2024-11-20"),
            "processing_time_seconds": round(processing_time, 2),
            "node_count": node_count,
            "max_depth": max_depth,
        }
    }


async def build_tree_from_markdown(md_path: str, options: Optional[Dict] = None) -> Dict:
    """Build tree from Markdown document using PageIndex."""
    if not PAGEINDEX_AVAILABLE:
        raise ImportError("PageIndex library is not installed. Run: pip install pageindex")

    if not os.path.exists(md_path):
        raise FileNotFoundError(f"Document not found: {md_path}")

    options = options or {}

    start_time = time.time()

    result = await md_to_tree(
        md_path=md_path,
        if_thinning=options.get("if_thinning", False),
        min_token_threshold=options.get("min_token_threshold", 5000),
        if_add_node_summary=options.get("if_add_node_summary", "yes"),
        summary_token_threshold=options.get("summary_token_threshold", 200),
        model=options.get("model", "gpt-4o-2024-11-20"),
        if_add_doc_description=options.get("if_add_doc_description", "yes"),
        if_add_node_text=options.get("if_add_node_text", "no"),
        if_add_node_id=options.get("if_add_node_id", "yes"),
    )

    processing_time = time.time() - start_time

    structure = result.get("structure", [])
    node_count, max_depth = count_nodes(structure)
    tree_structure = transform_structure(structure)

    return {
        "doc_name": result.get("doc_name", Path(md_path).name),
        "doc_description": result.get("doc_description"),
        "structure": tree_structure,
        "metadata": {
            "model": options.get("model", "gpt-4o-2024-11-20"),
            "processing_time_seconds": round(processing_time, 2),
            "node_count": node_count,
            "max_depth": max_depth,
        }
    }


def build_tree_from_text(text: str, document_name: str, options: Optional[Dict] = None) -> Dict:
    """Build tree from plain text content.

    For plain text without clear structure, we create a simple tree
    based on paragraphs/sections detected by double newlines.
    """
    import tempfile
    import os

    # Write text to temporary markdown file
    with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False, encoding='utf-8') as f:
        f.write(text)
        temp_path = f.name

    try:
        # Process as markdown
        result = asyncio.run(build_tree_from_markdown(temp_path, options))
        result["doc_name"] = document_name
        return result
    finally:
        # Clean up temp file
        os.unlink(temp_path)


def create_simple_tree(text: str, document_name: str) -> Dict:
    """Create a simple tree structure from plain text without PageIndex.

    This is a fallback when PageIndex is not available or for testing.
    """
    lines = text.strip().split('\n')
    sections = []
    current_section = {"title": "Root", "content": "", "children": []}
    current_subsection = None

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue

        # Detect headings (# or ## in markdown style)
        if stripped.startswith('# '):
            if current_section["content"] or current_section["children"]:
                sections.append(current_section)
            current_section = {
                "title": stripped[2:],
                "content": "",
                "children": []
            }
            current_subsection = None
        elif stripped.startswith('## '):
            current_subsection = {
                "title": stripped[3:],
                "content": "",
                "children": []
            }
            current_section["children"].append(current_subsection)
        else:
            if current_subsection:
                current_subsection["content"] += stripped + "\n"
            else:
                current_section["content"] += stripped + "\n"

    # Add last section
    if current_section["content"] or current_section["children"]:
        sections.append(current_section)

    # If no sections detected, create single root
    if not sections:
        sections = [{
            "title": document_name,
            "content": text[:1000],  # First 1000 chars as preview
            "children": []
        }]

    def transform_simple(nodes: list, level: int = 0) -> list:
        result = []
        for idx, node in enumerate(nodes):
            transformed = {
                "id": f"node_{level}_{idx}",
                "title": node["title"],
                "level": level,
                "content": node.get("content", "").strip() or None,
                "pageNumbers": [],
                "children": transform_simple(node.get("children", []), level + 1)
            }
            # Remove None content
            if transformed["content"] is None:
                del transformed["content"]
            result.append(transformed)
        return result

    tree_structure = transform_simple(sections)
    node_count, max_depth = 0, 0

    def count(nodes, depth):
        nonlocal node_count, max_depth
        for n in nodes:
            node_count += 1
            max_depth = max(max_depth, depth)
            count(n.get("children", []), depth + 1)

    count(tree_structure, 0)

    return {
        "doc_name": document_name,
        "doc_description": f"Simple tree structure for {document_name}",
        "structure": tree_structure,
        "metadata": {
            "model": "simple-parser",
            "processing_time_seconds": 0.01,
            "node_count": node_count,
            "max_depth": max_depth,
            "fallback": True,
        }
    }


def main():
    """Main entry point - read JSON from stdin, process, write JSON to stdout."""
    try:
        # Read input from stdin
        input_data = sys.stdin.read()
        if not input_data.strip():
            send_error("INVALID_INPUT", "No input provided")
            return 1

        try:
            request = json.loads(input_data)
        except json.JSONDecodeError as e:
            send_error("INVALID_INPUT", f"Invalid JSON input: {str(e)}")
            return 1

        action = request.get("action")
        if not action:
            send_error("INVALID_INPUT", "Missing 'action' field")
            return 1

        options = request.get("options", {})

        if action == "build":
            # Build tree from document file
            document_path = request.get("document_path")
            if not document_path:
                send_error("INVALID_INPUT", "Missing 'document_path' for build action")
                return 1

            ext = Path(document_path).suffix.lower()

            if ext == ".pdf":
                result = build_tree_from_pdf(document_path, options)
            elif ext in [".md", ".markdown"]:
                result = asyncio.run(build_tree_from_markdown(document_path, options))
            elif ext == ".txt":
                with open(document_path, 'r', encoding='utf-8') as f:
                    text = f.read()
                result = build_tree_from_text(text, Path(document_path).name, options)
            else:
                send_error("INVALID_INPUT", f"Unsupported file type: {ext}")
                return 1

            send_response(True, result)

        elif action == "build_from_text":
            # Build tree from text content
            text = request.get("text")
            document_name = request.get("document_name", "document.txt")

            if not text:
                send_error("INVALID_INPUT", "Missing 'text' for build_from_text action")
                return 1

            # Use simple parser if PageIndex not available
            if not PAGEINDEX_AVAILABLE:
                result = create_simple_tree(text, document_name)
            else:
                result = build_tree_from_text(text, document_name, options)

            send_response(True, result)

        elif action == "health":
            # Health check
            send_response(True, {
                "status": "healthy",
                "pageindex_available": PAGEINDEX_AVAILABLE,
                "python_version": sys.version,
            })

        else:
            send_error("INVALID_INPUT", f"Unknown action: {action}")
            return 1

        return 0

    except ImportError as e:
        send_error("PROCESSING_ERROR", f"Missing dependency: {str(e)}")
        return 1
    except FileNotFoundError as e:
        send_error("INVALID_INPUT", str(e))
        return 1
    except Exception as e:
        send_error("PROCESSING_ERROR", f"Unexpected error: {str(e)}", {
            "type": type(e).__name__
        })
        return 1


if __name__ == "__main__":
    sys.exit(main())
