import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemCategory, ItemCategoryType } from '../../../entities/item-category.entity';

/**
 * Interface for category seed data.
 */
interface CategorySeedData {
  code: string;
  name: string;
  type: ItemCategoryType;
  parentCode: string | null;
  description: string | null;
  level: number;
  keywords: string[];
  commonUnits: string[];
}

/**
 * Auto-seed service for item categories based on CATMAT/CATSER.
 *
 * Executes on application bootstrap and populates categories if none exist.
 *
 * Issue #1602 - [ANALYTICS-1270a] Create ItemCategory entity with CATMAT/CATSER taxonomy
 * Parent: #1270 - [Analytics-b] Price normalization and categorization
 *
 * This seeder creates a hierarchical taxonomy of item categories:
 * - Level 0: Root categories (CATMAT Materials, CATSER Services)
 * - Level 1: Main categories (e.g., TI Equipment, Office Supplies)
 * - Level 2: Subcategories (e.g., Notebooks, Desktops)
 *
 * Data Sources:
 * - CATMAT (Catálogo de Materiais) - https://www.gov.br/compras/pt-br/sistemas/outros-sistemas/catalogos/catmat
 * - CATSER (Catálogo de Serviços) - https://www.gov.br/compras/pt-br/sistemas/outros-sistemas/catalogos/catser
 */
@Injectable()
export class ItemCategorySeeder implements OnApplicationBootstrap {
  private readonly logger = new Logger(ItemCategorySeeder.name);

  constructor(
    @InjectRepository(ItemCategory)
    private readonly categoryRepository: Repository<ItemCategory>,
  ) {}

  /**
   * Called on application bootstrap.
   * Seeds categories if none exist.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.seedCategoriesIfNeeded();
  }

  /**
   * Check if categories exist and seed if necessary.
   */
  async seedCategoriesIfNeeded(): Promise<void> {
    try {
      const count = await this.categoryRepository.count();

      if (count > 0) {
        this.logger.log(
          `Item categories already seeded: ${count} categories found`,
        );
        return;
      }

      this.logger.log('No item categories found, starting auto-seed...');
      await this.seedAllCategories();
      this.logger.log('Item categories auto-seed completed successfully');
    } catch (error) {
      this.logger.error('Failed to auto-seed item categories', error);
      // Don't throw - allow app to start even if seed fails
    }
  }

  /**
   * Seed all item categories in hierarchical order.
   */
  private async seedAllCategories(): Promise<void> {
    // Seed root categories first
    const rootCategories = this.getRootCategories();
    for (const category of rootCategories) {
      await this.createCategory(category);
    }

    // Seed CATMAT categories (Level 1 and 2)
    const catmatCategories = this.getCatmatCategories();
    for (const category of catmatCategories) {
      await this.createCategory(category);
    }

    // Seed CATSER categories (Level 1 and 2)
    const catserCategories = this.getCatserCategories();
    for (const category of catserCategories) {
      await this.createCategory(category);
    }

    const totalCount = await this.categoryRepository.count();
    this.logger.log(`Seeded ${totalCount} item categories`);
  }

  /**
   * Create a single category.
   */
  private async createCategory(data: CategorySeedData): Promise<void> {
    // Check if already exists
    const existing = await this.categoryRepository.findOne({
      where: { code: data.code },
    });

    if (existing) {
      this.logger.debug(`Category ${data.code} already exists, skipping`);
      return;
    }

    const category = this.categoryRepository.create({
      code: data.code,
      name: data.name,
      type: data.type,
      parentCode: data.parentCode,
      description: data.description,
      level: data.level,
      keywords: data.keywords,
      commonUnits: data.commonUnits,
      active: true,
      itemCount: 0,
    });

    await this.categoryRepository.save(category);
    this.logger.debug(`Created category: ${data.code} - ${data.name}`);
  }

  /**
   * Get root categories (Level 0).
   */
  private getRootCategories(): CategorySeedData[] {
    return [
      {
        code: 'CATMAT-ROOT',
        name: 'Materiais (CATMAT)',
        type: ItemCategoryType.CATMAT,
        parentCode: null,
        description: 'Catálogo de Materiais - Bens tangíveis de consumo ou permanentes',
        level: 0,
        keywords: ['material', 'bem', 'produto', 'consumo', 'permanente'],
        commonUnits: [],
      },
      {
        code: 'CATSER-ROOT',
        name: 'Serviços (CATSER)',
        type: ItemCategoryType.CATSER,
        parentCode: null,
        description: 'Catálogo de Serviços - Prestação de serviços',
        level: 0,
        keywords: ['serviço', 'prestação', 'contratação'],
        commonUnits: [],
      },
    ];
  }

  /**
   * Get CATMAT categories (Materials).
   * Based on ComprasNet CATMAT hierarchy.
   */
  private getCatmatCategories(): CategorySeedData[] {
    return [
      // Level 1: Main Material Categories
      {
        code: 'CATMAT-44000',
        name: 'Equipamentos de TI',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-ROOT',
        description: 'Equipamentos de tecnologia da informação e comunicação',
        level: 1,
        keywords: ['informática', 'ti', 'computador', 'tecnologia', 'equipamento'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-75000',
        name: 'Material de Expediente',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-ROOT',
        description: 'Materiais de escritório e expediente',
        level: 1,
        keywords: ['escritório', 'papel', 'caneta', 'expediente', 'office'],
        commonUnits: ['UN', 'PCT', 'CX', 'RSM'],
      },
      {
        code: 'CATMAT-52000',
        name: 'Mobiliário',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-ROOT',
        description: 'Móveis e equipamentos de escritório',
        level: 1,
        keywords: ['móvel', 'cadeira', 'mesa', 'armário', 'mobiliário'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-30000',
        name: 'Material Elétrico',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-ROOT',
        description: 'Materiais elétricos e eletrônicos',
        level: 1,
        keywords: ['elétrico', 'fio', 'cabo', 'lâmpada', 'tomada'],
        commonUnits: ['UN', 'M', 'RL'],
      },
      {
        code: 'CATMAT-85000',
        name: 'Material de Limpeza',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-ROOT',
        description: 'Produtos de limpeza e higiene',
        level: 1,
        keywords: ['limpeza', 'detergente', 'sabão', 'higiene', 'desinfetante'],
        commonUnits: ['UN', 'L', 'GL', 'CX'],
      },
      {
        code: 'CATMAT-91000',
        name: 'Material de Construção',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-ROOT',
        description: 'Materiais para construção civil',
        level: 1,
        keywords: ['construção', 'cimento', 'areia', 'tijolo', 'obra'],
        commonUnits: ['UN', 'KG', 'M3', 'SC'],
      },

      // Level 2: TI Equipment Subcategories
      {
        code: 'CATMAT-44122',
        name: 'Notebooks e Laptops',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-44000',
        description: 'Computadores portáteis tipo notebook, laptop, ultrabook',
        level: 2,
        keywords: ['notebook', 'laptop', 'portátil', 'ultrabook', 'dell', 'hp', 'lenovo'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-44121',
        name: 'Desktops e Workstations',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-44000',
        description: 'Computadores de mesa e estações de trabalho',
        level: 2,
        keywords: ['desktop', 'workstation', 'pc', 'computador', 'torre'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-44103',
        name: 'Monitores',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-44000',
        description: 'Monitores de vídeo para computador',
        level: 2,
        keywords: ['monitor', 'tela', 'display', 'lcd', 'led'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-44201',
        name: 'Impressoras',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-44000',
        description: 'Impressoras e multifuncionais',
        level: 2,
        keywords: ['impressora', 'multifuncional', 'scanner', 'laser', 'jato de tinta'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-44310',
        name: 'Servidores',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-44000',
        description: 'Servidores de rede e storage',
        level: 2,
        keywords: ['servidor', 'storage', 'rack', 'blade', 'data center'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-44150',
        name: 'Periféricos',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-44000',
        description: 'Teclados, mouses, headsets e outros periféricos',
        level: 2,
        keywords: ['teclado', 'mouse', 'headset', 'webcam', 'periférico'],
        commonUnits: ['UN'],
      },

      // Level 2: Office Supplies Subcategories
      {
        code: 'CATMAT-75050',
        name: 'Papéis',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-75000',
        description: 'Papéis para escritório (A4, ofício, etc)',
        level: 2,
        keywords: ['papel', 'a4', 'ofício', 'sulfite', 'resma'],
        commonUnits: ['PCT', 'RSM', 'CX'],
      },
      {
        code: 'CATMAT-75040',
        name: 'Canetas e Lápis',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-75000',
        description: 'Materiais de escrita',
        level: 2,
        keywords: ['caneta', 'lápis', 'lapiseira', 'marca texto', 'escrita'],
        commonUnits: ['UN', 'CX'],
      },
      {
        code: 'CATMAT-75060',
        name: 'Material de Arquivo',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-75000',
        description: 'Pastas, fichários e material de arquivo',
        level: 2,
        keywords: ['pasta', 'fichário', 'arquivo', 'organizador', 'envelope'],
        commonUnits: ['UN', 'CX'],
      },

      // Level 2: Furniture Subcategories
      {
        code: 'CATMAT-52071',
        name: 'Cadeiras de Escritório',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-52000',
        description: 'Cadeiras executivas, giratórias e ergonômicas',
        level: 2,
        keywords: ['cadeira', 'giratória', 'executiva', 'ergonômica', 'poltrona'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-52072',
        name: 'Mesas de Escritório',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-52000',
        description: 'Mesas, escrivaninhas e estações de trabalho',
        level: 2,
        keywords: ['mesa', 'escrivaninha', 'estação de trabalho', 'bancada'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-52073',
        name: 'Armários e Estantes',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-52000',
        description: 'Armários, estantes e gaveteiros',
        level: 2,
        keywords: ['armário', 'estante', 'gaveteiro', 'arquivo', 'prateleira'],
        commonUnits: ['UN'],
      },

      // Level 2: Cleaning Subcategories
      {
        code: 'CATMAT-85101',
        name: 'Detergentes e Sabões',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-85000',
        description: 'Detergentes, sabões e limpadores',
        level: 2,
        keywords: ['detergente', 'sabão', 'limpador', 'multiuso', 'desengordurante'],
        commonUnits: ['UN', 'L', 'GL'],
      },
      {
        code: 'CATMAT-85102',
        name: 'Desinfetantes',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-85000',
        description: 'Desinfetantes e sanitizantes',
        level: 2,
        keywords: ['desinfetante', 'sanitizante', 'álcool', 'hipoclorito'],
        commonUnits: ['UN', 'L', 'GL'],
      },
      {
        code: 'CATMAT-85103',
        name: 'Materiais de Higiene',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-85000',
        description: 'Papel toalha, papel higiênico, sabonete',
        level: 2,
        keywords: ['papel toalha', 'papel higiênico', 'sabonete', 'álcool gel'],
        commonUnits: ['UN', 'FD', 'CX'],
      },

      // Level 2: Construction Subcategories
      {
        code: 'CATMAT-91101',
        name: 'Cimento e Argamassa',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-91000',
        description: 'Cimentos, argamassas e concretos',
        level: 2,
        keywords: ['cimento', 'argamassa', 'concreto', 'rejunte', 'massa'],
        commonUnits: ['KG', 'SC'],
      },
      {
        code: 'CATMAT-91102',
        name: 'Tintas e Vernizes',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-91000',
        description: 'Tintas, vernizes e solventes',
        level: 2,
        keywords: ['tinta', 'verniz', 'solvente', 'thinner', 'primer'],
        commonUnits: ['GL', 'L', 'LT'],
      },
      {
        code: 'CATMAT-91103',
        name: 'Pisos e Revestimentos',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-91000',
        description: 'Pisos cerâmicos, porcelanatos e revestimentos',
        level: 2,
        keywords: ['piso', 'cerâmica', 'porcelanato', 'revestimento', 'azulejo'],
        commonUnits: ['M2', 'CX'],
      },

      // Level 2: Electrical Material Subcategories
      {
        code: 'CATMAT-30101',
        name: 'Cabos e Fios Elétricos',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-30000',
        description: 'Cabos, fios e condutores elétricos',
        level: 2,
        keywords: ['cabo', 'fio', 'condutor', 'elétrico', 'cobre'],
        commonUnits: ['M', 'RL'],
      },
      {
        code: 'CATMAT-30102',
        name: 'Lâmpadas e Iluminação',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-30000',
        description: 'Lâmpadas, luminárias e equipamentos de iluminação',
        level: 2,
        keywords: ['lâmpada', 'led', 'luminária', 'iluminação', 'fluorescente'],
        commonUnits: ['UN'],
      },
      {
        code: 'CATMAT-30103',
        name: 'Tomadas e Interruptores',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-30000',
        description: 'Tomadas, interruptores e dispositivos de comando',
        level: 2,
        keywords: ['tomada', 'interruptor', 'disjuntor', 'plug'],
        commonUnits: ['UN'],
      },

      // Additional Office Supplies
      {
        code: 'CATMAT-75070',
        name: 'Grampeadores e Furadores',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-75000',
        description: 'Grampeadores, furadores e utensílios de escritório',
        level: 2,
        keywords: ['grampeador', 'furador', 'grampo', 'clips', 'alicate'],
        commonUnits: ['UN', 'CX'],
      },

      // Additional TI subcategories
      {
        code: 'CATMAT-44160',
        name: 'Cabos e Conectores TI',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-44000',
        description: 'Cabos de rede, USB, HDMI e conectores diversos',
        level: 2,
        keywords: ['cabo', 'hdmi', 'usb', 'rede', 'conector', 'rj45'],
        commonUnits: ['UN', 'M'],
      },
      {
        code: 'CATMAT-44170',
        name: 'Dispositivos de Armazenamento',
        type: ItemCategoryType.CATMAT,
        parentCode: 'CATMAT-44000',
        description: 'HDs, SSDs, pendrives e dispositivos de armazenamento',
        level: 2,
        keywords: ['hd', 'ssd', 'pendrive', 'storage', 'memória', 'armazenamento'],
        commonUnits: ['UN'],
      },
    ];
  }

  /**
   * Get CATSER categories (Services).
   * Based on ComprasNet CATSER hierarchy.
   */
  private getCatserCategories(): CategorySeedData[] {
    return [
      // Level 1: Main Service Categories
      {
        code: 'CATSER-10000',
        name: 'Serviços de TI',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-ROOT',
        description: 'Serviços de tecnologia da informação e comunicação',
        level: 1,
        keywords: ['ti', 'software', 'desenvolvimento', 'suporte', 'infraestrutura'],
        commonUnits: ['UN', 'MÊS', 'HORA'],
      },
      {
        code: 'CATSER-20000',
        name: 'Serviços de Limpeza',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-ROOT',
        description: 'Serviços de limpeza e conservação',
        level: 1,
        keywords: ['limpeza', 'conservação', 'asseio', 'higienização'],
        commonUnits: ['M2', 'MÊS', 'POSTO'],
      },
      {
        code: 'CATSER-21000',
        name: 'Serviços de Vigilância',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-ROOT',
        description: 'Serviços de vigilância e segurança patrimonial',
        level: 1,
        keywords: ['vigilância', 'segurança', 'monitoramento', 'patrimonial'],
        commonUnits: ['POSTO', 'MÊS', 'HORA'],
      },
      {
        code: 'CATSER-25000',
        name: 'Serviços de Engenharia',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-ROOT',
        description: 'Serviços de engenharia e arquitetura',
        level: 1,
        keywords: ['engenharia', 'obra', 'construção', 'reforma', 'projeto'],
        commonUnits: ['M2', 'UN', 'GL'],
      },
      {
        code: 'CATSER-27000',
        name: 'Serviços de Manutenção',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-ROOT',
        description: 'Serviços de manutenção predial e de equipamentos',
        level: 1,
        keywords: ['manutenção', 'preventiva', 'corretiva', 'reparo'],
        commonUnits: ['UN', 'MÊS', 'HORA'],
      },
      {
        code: 'CATSER-30000',
        name: 'Serviços de Consultoria',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-ROOT',
        description: 'Serviços de consultoria e assessoria',
        level: 1,
        keywords: ['consultoria', 'assessoria', 'parecer', 'estudo'],
        commonUnits: ['HORA', 'UN', 'MÊS'],
      },

      // Level 2: IT Services Subcategories
      {
        code: 'CATSER-10391',
        name: 'Desenvolvimento de Software',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-10000',
        description: 'Desenvolvimento, customização e evolução de sistemas',
        level: 2,
        keywords: ['desenvolvimento', 'software', 'sistema', 'programação', 'aplicativo'],
        commonUnits: ['PF', 'UST', 'HORA'],
      },
      {
        code: 'CATSER-10392',
        name: 'Suporte Técnico TI',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-10000',
        description: 'Suporte técnico a usuários e infraestrutura',
        level: 2,
        keywords: ['suporte', 'helpdesk', 'service desk', 'atendimento', 'chamado'],
        commonUnits: ['CHAMADO', 'MÊS', 'POSTO'],
      },
      {
        code: 'CATSER-10393',
        name: 'Infraestrutura de TI',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-10000',
        description: 'Gerenciamento de infraestrutura, redes e data center',
        level: 2,
        keywords: ['infraestrutura', 'rede', 'data center', 'servidor', 'nuvem'],
        commonUnits: ['MÊS', 'UN', 'GB'],
      },
      {
        code: 'CATSER-10394',
        name: 'Cloud Computing',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-10000',
        description: 'Serviços de computação em nuvem (IaaS, PaaS, SaaS)',
        level: 2,
        keywords: ['cloud', 'nuvem', 'iaas', 'paas', 'saas', 'aws', 'azure'],
        commonUnits: ['MÊS', 'GB', 'VCPU'],
      },

      // Level 2: Cleaning Services Subcategories
      {
        code: 'CATSER-20101',
        name: 'Limpeza de Áreas Internas',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-20000',
        description: 'Limpeza de escritórios, salas e ambientes internos',
        level: 2,
        keywords: ['limpeza', 'interno', 'escritório', 'sala', 'conservação'],
        commonUnits: ['M2', 'MÊS'],
      },
      {
        code: 'CATSER-20102',
        name: 'Limpeza de Áreas Externas',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-20000',
        description: 'Limpeza de estacionamentos, jardins e áreas externas',
        level: 2,
        keywords: ['limpeza', 'externo', 'estacionamento', 'jardim', 'fachada'],
        commonUnits: ['M2', 'MÊS'],
      },

      // Level 2: Security Services Subcategories
      {
        code: 'CATSER-21101',
        name: 'Vigilância Armada',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-21000',
        description: 'Vigilância patrimonial com uso de arma de fogo',
        level: 2,
        keywords: ['vigilância', 'armada', 'segurança', 'patrimonial'],
        commonUnits: ['POSTO', 'MÊS'],
      },
      {
        code: 'CATSER-21102',
        name: 'Vigilância Desarmada',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-21000',
        description: 'Vigilância patrimonial sem uso de arma de fogo',
        level: 2,
        keywords: ['vigilância', 'desarmada', 'segurança', 'portaria'],
        commonUnits: ['POSTO', 'MÊS'],
      },

      // Level 2: Engineering Services Subcategories
      {
        code: 'CATSER-25101',
        name: 'Obras Civis',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-25000',
        description: 'Construção, ampliação e reforma de edificações',
        level: 2,
        keywords: ['obra', 'construção', 'reforma', 'ampliação', 'edificação'],
        commonUnits: ['M2', 'GL'],
      },
      {
        code: 'CATSER-25102',
        name: 'Projetos de Engenharia',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-25000',
        description: 'Elaboração de projetos de engenharia e arquitetura',
        level: 2,
        keywords: ['projeto', 'engenharia', 'arquitetura', 'planta', 'desenho'],
        commonUnits: ['UN', 'M2'],
      },

      // Level 2: Maintenance Services Subcategories
      {
        code: 'CATSER-27101',
        name: 'Manutenção Predial',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-27000',
        description: 'Manutenção de instalações prediais',
        level: 2,
        keywords: ['manutenção', 'predial', 'elétrica', 'hidráulica', 'civil'],
        commonUnits: ['MÊS', 'HORA'],
      },
      {
        code: 'CATSER-27102',
        name: 'Manutenção de Ar Condicionado',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-27000',
        description: 'Manutenção de sistemas de climatização',
        level: 2,
        keywords: ['ar condicionado', 'climatização', 'hvac', 'refrigeração'],
        commonUnits: ['UN', 'MÊS', 'BTU'],
      },
      {
        code: 'CATSER-27103',
        name: 'Manutenção de Elevadores',
        type: ItemCategoryType.CATSER,
        parentCode: 'CATSER-27000',
        description: 'Manutenção de elevadores e equipamentos de transporte vertical',
        level: 2,
        keywords: ['elevador', 'escada rolante', 'transporte vertical'],
        commonUnits: ['UN', 'MÊS'],
      },
    ];
  }
}
