import { ContractItem } from '../dto/normalized-item.dto';

/**
 * Benchmark item with expected classification results.
 * Used to validate normalization accuracy.
 *
 * @see Issue #1607 - Benchmark and accuracy validation
 * @see Issue #1270 - Price normalization and categorization (Parent)
 */
export interface BenchmarkItem {
  /**
   * Input item to be normalized.
   */
  input: ContractItem;

  /**
   * Expected category code after normalization.
   */
  expectedCategory: string;

  /**
   * Expected normalized description (optional - used for similarity checks).
   */
  expectedDescription?: string;

  /**
   * Expected normalized unit.
   */
  expectedUnit: string;

  /**
   * Expected type (material or servico).
   */
  expectedType: 'material' | 'servico';

  /**
   * Similar items that should be grouped together.
   * Used for grouping accuracy tests.
   */
  similarGroup?: string;
}

/**
 * Benchmark dataset with 100 diverse items covering:
 * - CATMAT (materials): 60 items
 * - CATSER (services): 40 items
 * - Multiple regions (UFs)
 * - Various unit formats
 * - Similar item groups for accuracy testing
 *
 * Categories based on seeded CATMAT/CATSER taxonomy from #1602.
 *
 * @see Issue #1607 - Benchmark and accuracy validation
 * @see ItemCategorySeeder for available categories
 */
export const benchmarkDataset: BenchmarkItem[] = [
  // ============================================================================
  // CATMAT - INFORMÁTICA E EQUIPAMENTOS (44.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-001',
      description: 'NOTEBOOK DELL LATITUDE 5420 I5 8GB 256GB SSD',
      unit: 'UNIDADE',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-44122',
    expectedDescription: 'notebook',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'NOTEBOOK',
  },
  {
    input: {
      id: 'BM-002',
      description: 'COMPUTADOR PORTÁTIL DELL MODELO LATITUDE 5420',
      unit: 'UN',
      source: 'pncp',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-44122',
    expectedDescription: 'notebook',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'NOTEBOOK',
  },
  {
    input: {
      id: 'BM-003',
      description: 'NOTEBOOK HP PROBOOK 450 G8 CORE I7 16GB 512GB',
      unit: 'UNID',
      source: 'comprasgov',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-44122',
    expectedDescription: 'notebook',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'NOTEBOOK',
  },
  {
    input: {
      id: 'BM-004',
      description: 'MICROCOMPUTADOR DESKTOP HP PRODESK 400 G7 I5 8GB 500GB',
      unit: 'UNIDADE',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATMAT-44121',
    expectedDescription: 'desktop',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'DESKTOP',
  },
  {
    input: {
      id: 'BM-005',
      description:
        'COMPUTADOR DE MESA INTEL CORE I5 8 GERAÇÃO 8GB RAM SSD 256GB',
      unit: 'UN',
      source: 'pncp',
      uf: 'BA',
    },
    expectedCategory: 'CATMAT-44121',
    expectedDescription: 'desktop',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'DESKTOP',
  },
  {
    input: {
      id: 'BM-006',
      description: 'MONITOR LED 24 POLEGADAS FULL HD HDMI VGA',
      unit: 'UN',
      source: 'pncp',
      uf: 'PR',
    },
    expectedCategory: 'CATMAT-44123',
    expectedDescription: 'monitor',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'MONITOR',
  },
  {
    input: {
      id: 'BM-007',
      description: 'TELA MONITOR 27" 4K UHD SAMSUNG DISPLAYPORT',
      unit: 'UNIDADE',
      source: 'comprasgov',
      uf: 'SC',
    },
    expectedCategory: 'CATMAT-44123',
    expectedDescription: 'monitor',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'MONITOR',
  },
  {
    input: {
      id: 'BM-008',
      description: 'IMPRESSORA MULTIFUNCIONAL LASER MONOCROMATICA HP M428FDW',
      unit: 'UN',
      source: 'pncp',
      uf: 'RS',
    },
    expectedCategory: 'CATMAT-44124',
    expectedDescription: 'impressora',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'IMPRESSORA',
  },
  {
    input: {
      id: 'BM-009',
      description: 'EQUIPAMENTO IMPRESSÃO LASER COLOR A3 XEROX VERSALINK',
      unit: 'UNID',
      source: 'pncp',
      uf: 'GO',
    },
    expectedCategory: 'CATMAT-44124',
    expectedDescription: 'impressora',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'IMPRESSORA',
  },
  {
    input: {
      id: 'BM-010',
      description: 'TECLADO USB PADRÃO ABNT2 PRETO',
      unit: 'UN',
      source: 'pncp',
      uf: 'PE',
    },
    expectedCategory: 'CATMAT-44125',
    expectedDescription: 'teclado',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-011',
      description: 'MOUSE ÓPTICO USB 1000DPI PRETO',
      unit: 'UNIDADE',
      source: 'comprasgov',
      uf: 'CE',
    },
    expectedCategory: 'CATMAT-44126',
    expectedDescription: 'mouse',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-012',
      description: 'PROJETOR MULTIMIDIA 3500 LUMENS HDMI VGA EPSON',
      unit: 'UN',
      source: 'pncp',
      uf: 'AM',
    },
    expectedCategory: 'CATMAT-44127',
    expectedDescription: 'projetor',
    expectedUnit: 'UN',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - MATERIAL DE ESCRITÓRIO (75.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-013',
      description: 'PAPEL SULFITE A4 BRANCO 75G/M² PACOTE 500 FLS',
      unit: 'PACOTE',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-75050',
    expectedDescription: 'papel sulfite',
    expectedUnit: 'PCT',
    expectedType: 'material',
    similarGroup: 'PAPEL_A4',
  },
  {
    input: {
      id: 'BM-014',
      description: 'PAPEL A4 SULFITE BRANCO 75 GRAMAS RESMA 500 FOLHAS',
      unit: 'RM',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-75050',
    expectedDescription: 'papel sulfite',
    expectedUnit: 'RM',
    expectedType: 'material',
    similarGroup: 'PAPEL_A4',
  },
  {
    input: {
      id: 'BM-015',
      description: 'RESMA PAPEL A4 ALCALINO 75G BRANCO CHAMEX',
      unit: 'RESMA',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-75050',
    expectedDescription: 'papel sulfite',
    expectedUnit: 'RM',
    expectedType: 'material',
    similarGroup: 'PAPEL_A4',
  },
  {
    input: {
      id: 'BM-016',
      description: 'TONER HP 85A CE285A PRETO ORIGINAL',
      unit: 'UN',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATMAT-75051',
    expectedDescription: 'toner',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'TONER',
  },
  {
    input: {
      id: 'BM-017',
      description: 'CARTUCHO TONER COMPATÍVEL HP CF283A 83A PRETO',
      unit: 'UNIDADE',
      source: 'comprasgov',
      uf: 'BA',
    },
    expectedCategory: 'CATMAT-75051',
    expectedDescription: 'toner',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'TONER',
  },
  {
    input: {
      id: 'BM-018',
      description: 'CANETA ESFEROGRÁFICA AZUL PONTA MÉDIA 1.0MM BIC',
      unit: 'CAIXA',
      source: 'pncp',
      uf: 'PR',
    },
    expectedCategory: 'CATMAT-75052',
    expectedDescription: 'caneta',
    expectedUnit: 'CX',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-019',
      description: 'LÁPIS PRETO Nº 2 GRAFITE CAIXA 144 UNIDADES',
      unit: 'CX',
      source: 'pncp',
      uf: 'SC',
    },
    expectedCategory: 'CATMAT-75053',
    expectedDescription: 'lapis',
    expectedUnit: 'CX',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-020',
      description: 'GRAMPEADOR METAL PARA 25 FOLHAS',
      unit: 'UN',
      source: 'comprasgov',
      uf: 'RS',
    },
    expectedCategory: 'CATMAT-75054',
    expectedDescription: 'grampeador',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-021',
      description: 'CLIPS METAL NIQUELADO 2/0 CAIXA 500 UNIDADES',
      unit: 'CAIXA',
      source: 'pncp',
      uf: 'GO',
    },
    expectedCategory: 'CATMAT-75055',
    expectedDescription: 'clips',
    expectedUnit: 'CX',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-022',
      description: 'PASTA AZ REGISTRADOR LOMBO LARGO VERDE',
      unit: 'UN',
      source: 'pncp',
      uf: 'PE',
    },
    expectedCategory: 'CATMAT-75056',
    expectedDescription: 'pasta arquivo',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-023',
      description: 'FITA ADESIVA TRANSPARENTE 12MM X 30M',
      unit: 'UN',
      source: 'comprasgov',
      uf: 'CE',
    },
    expectedCategory: 'CATMAT-75057',
    expectedDescription: 'fita adesiva',
    expectedUnit: 'UN',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - MOBILIÁRIO (71.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-024',
      description: 'CADEIRA GIRATÓRIA ESCRITÓRIO ERGONÔMICA BASE CROMADA',
      unit: 'UN',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-71001',
    expectedDescription: 'cadeira escritorio',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'CADEIRA',
  },
  {
    input: {
      id: 'BM-025',
      description: 'POLTRONA EXECUTIVA GIRATÓRIA COURO SINTÉTICO PRETA',
      unit: 'UNIDADE',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-71001',
    expectedDescription: 'cadeira escritorio',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'CADEIRA',
  },
  {
    input: {
      id: 'BM-026',
      description: 'MESA ESCRITÓRIO RETA MDP 1,20M CINZA',
      unit: 'UN',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-71002',
    expectedDescription: 'mesa escritorio',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'MESA',
  },
  {
    input: {
      id: 'BM-027',
      description: 'ESTAÇÃO TRABALHO INDIVIDUAL 1,40M X 0,60M MDF',
      unit: 'UNID',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATMAT-71002',
    expectedDescription: 'mesa escritorio',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'MESA',
  },
  {
    input: {
      id: 'BM-028',
      description: 'ARMÁRIO ALTO 2 PORTAS MDP FECHADURA 1,60M',
      unit: 'UN',
      source: 'comprasgov',
      uf: 'BA',
    },
    expectedCategory: 'CATMAT-71003',
    expectedDescription: 'armario',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-029',
      description: 'ARQUIVO GAVETA AÇO 4 GAVETAS PASTA SUSPENSA',
      unit: 'UN',
      source: 'pncp',
      uf: 'PR',
    },
    expectedCategory: 'CATMAT-71004',
    expectedDescription: 'arquivo',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-030',
      description: 'ESTANTE AÇO DESMONTÁVEL 6 PRATELEIRAS 2,00M',
      unit: 'UN',
      source: 'pncp',
      uf: 'SC',
    },
    expectedCategory: 'CATMAT-71005',
    expectedDescription: 'estante',
    expectedUnit: 'UN',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - LIMPEZA E HIGIENE (76.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-031',
      description: 'PAPEL HIGIÊNICO FOLHA DUPLA BRANCO FARDO 64 ROLOS',
      unit: 'FARDO',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-76001',
    expectedDescription: 'papel higienico',
    expectedUnit: 'FD',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-032',
      description: 'PAPEL TOALHA INTERFOLHADO BRANCO 23X21 PACOTE 1000',
      unit: 'PCT',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-76002',
    expectedDescription: 'papel toalha',
    expectedUnit: 'PCT',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-033',
      description: 'SABONETE LÍQUIDO ERVA DOCE BOMBONA 5 LITROS',
      unit: 'BOMBONA',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-76003',
    expectedDescription: 'sabonete liquido',
    expectedUnit: 'BB',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-034',
      description: 'ÁLCOOL GEL 70% ANTISSÉPTICO FRASCO 500ML',
      unit: 'FRASCO',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATMAT-76004',
    expectedDescription: 'alcool gel',
    expectedUnit: 'FR',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-035',
      description: 'DESINFETANTE CONCENTRADO PINHO GALÃO 5 LITROS',
      unit: 'GALAO',
      source: 'comprasgov',
      uf: 'BA',
    },
    expectedCategory: 'CATMAT-76005',
    expectedDescription: 'desinfetante',
    expectedUnit: 'GL',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-036',
      description: 'ÁGUA SANITÁRIA GALÃO 5 LITROS',
      unit: 'GL',
      source: 'pncp',
      uf: 'PR',
    },
    expectedCategory: 'CATMAT-76006',
    expectedDescription: 'agua sanitaria',
    expectedUnit: 'GL',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-037',
      description: 'DETERGENTE NEUTRO 500ML',
      unit: 'UN',
      source: 'pncp',
      uf: 'SC',
    },
    expectedCategory: 'CATMAT-76007',
    expectedDescription: 'detergente',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-038',
      description: 'SACO LIXO 100 LITROS PRETO PACOTE 100 UNIDADES',
      unit: 'PCT',
      source: 'comprasgov',
      uf: 'RS',
    },
    expectedCategory: 'CATMAT-76008',
    expectedDescription: 'saco lixo',
    expectedUnit: 'PCT',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - ELÉTRICA E ILUMINAÇÃO (60.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-039',
      description: 'LÂMPADA LED BULBO 9W 6500K BRANCA BIVOLT',
      unit: 'UN',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-60001',
    expectedDescription: 'lampada led',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'LAMPADA',
  },
  {
    input: {
      id: 'BM-040',
      description: 'LÂMPADA TUBULAR LED T8 18W 120CM 6500K',
      unit: 'UNIDADE',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-60001',
    expectedDescription: 'lampada led',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'LAMPADA',
  },
  {
    input: {
      id: 'BM-041',
      description: 'LUMINÁRIA PAINEL LED EMBUTIR 24W 30X30CM',
      unit: 'UN',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-60002',
    expectedDescription: 'luminaria',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-042',
      description: 'EXTENSÃO ELÉTRICA 3 TOMADAS 5 METROS 2P+T',
      unit: 'UN',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATMAT-60003',
    expectedDescription: 'extensao eletrica',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-043',
      description: 'TOMADA PAREDE 20A 2P+T BRANCA',
      unit: 'UN',
      source: 'comprasgov',
      uf: 'BA',
    },
    expectedCategory: 'CATMAT-60004',
    expectedDescription: 'tomada',
    expectedUnit: 'UN',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - AR CONDICIONADO (40.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-044',
      description: 'AR CONDICIONADO SPLIT INVERTER 12000 BTUS SAMSUNG',
      unit: 'UN',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-40001',
    expectedDescription: 'ar condicionado',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'AR_CONDICIONADO',
  },
  {
    input: {
      id: 'BM-045',
      description: 'CONDICIONADOR DE AR SPLIT HI-WALL 18.000 BTU INVERTER LG',
      unit: 'UNIDADE',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-40001',
    expectedDescription: 'ar condicionado',
    expectedUnit: 'UN',
    expectedType: 'material',
    similarGroup: 'AR_CONDICIONADO',
  },
  {
    input: {
      id: 'BM-046',
      description: 'VENTILADOR TETO 3 PÁS 127V BRANCO',
      unit: 'UN',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-40002',
    expectedDescription: 'ventilador',
    expectedUnit: 'UN',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - MEDICAMENTOS E SAÚDE (65.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-047',
      description: 'DIPIRONA SÓDICA 500MG COMPRIMIDO CAIXA 200 UN',
      unit: 'CAIXA',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-65001',
    expectedDescription: 'medicamento',
    expectedUnit: 'CX',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-048',
      description: 'LUVA PROCEDIMENTO LATEX P CAIXA 100 UNIDADES',
      unit: 'CX',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-65002',
    expectedDescription: 'luva procedimento',
    expectedUnit: 'CX',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-049',
      description: 'MÁSCARA DESCARTÁVEL TRIPLA CAMADA PCT 50 UN',
      unit: 'PCT',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-65003',
    expectedDescription: 'mascara descartavel',
    expectedUnit: 'PCT',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - COMBUSTÍVEIS (91.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-050',
      description: 'GASOLINA COMUM LITRO',
      unit: 'LITRO',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-91001',
    expectedDescription: 'gasolina',
    expectedUnit: 'L',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-051',
      description: 'DIESEL S10 LITRO',
      unit: 'L',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-91002',
    expectedDescription: 'diesel',
    expectedUnit: 'L',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-052',
      description: 'ETANOL COMUM LITRO',
      unit: 'LT',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-91003',
    expectedDescription: 'etanol',
    expectedUnit: 'L',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - ALIMENTOS (89.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-053',
      description: 'ÁGUA MINERAL SEM GÁS 500ML CAIXA 24 UNIDADES',
      unit: 'CX',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-89001',
    expectedDescription: 'agua mineral',
    expectedUnit: 'CX',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-054',
      description: 'CAFÉ TORRADO E MOÍDO TIPO SUPERIOR PACOTE 500G',
      unit: 'PCT',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-89002',
    expectedDescription: 'cafe',
    expectedUnit: 'PCT',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-055',
      description: 'AÇÚCAR REFINADO PACOTE 1KG',
      unit: 'PCT',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATMAT-89003',
    expectedDescription: 'acucar',
    expectedUnit: 'PCT',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - VEÍCULOS (23.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-056',
      description: 'VEÍCULO SEDAN 1.0 FLEX 4 PORTAS AR CONDICIONADO',
      unit: 'UN',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATMAT-23001',
    expectedDescription: 'veiculo sedan',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-057',
      description: 'MOTOCICLETA 150CC PARTIDA ELÉTRICA',
      unit: 'UN',
      source: 'comprasgov',
      uf: 'BA',
    },
    expectedCategory: 'CATMAT-23002',
    expectedDescription: 'motocicleta',
    expectedUnit: 'UN',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-058',
      description: 'PNEU 175/70 R14 ARO 14',
      unit: 'UN',
      source: 'pncp',
      uf: 'PR',
    },
    expectedCategory: 'CATMAT-23003',
    expectedDescription: 'pneu',
    expectedUnit: 'UN',
    expectedType: 'material',
  },

  // ============================================================================
  // CATMAT - OUTROS MATERIAIS
  // ============================================================================
  {
    input: {
      id: 'BM-059',
      description: 'CABO REDE CAT6 METRO',
      unit: 'METRO',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATMAT-44128',
    expectedDescription: 'cabo rede',
    expectedUnit: 'M',
    expectedType: 'material',
  },
  {
    input: {
      id: 'BM-060',
      description: 'PENDRIVE 32GB USB 3.0',
      unit: 'UN',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATMAT-44129',
    expectedDescription: 'pendrive',
    expectedUnit: 'UN',
    expectedType: 'material',
  },

  // ============================================================================
  // CATSER - SERVIÇOS DE TI (10.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-061',
      description:
        'MANUTENÇÃO PREVENTIVA E CORRETIVA DE EQUIPAMENTOS DE INFORMÁTICA',
      unit: 'MES',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-10001',
    expectedDescription: 'manutencao ti',
    expectedUnit: 'MES',
    expectedType: 'servico',
    similarGroup: 'MANUTENCAO_TI',
  },
  {
    input: {
      id: 'BM-062',
      description: 'SERVIÇO DE SUPORTE TÉCNICO EM MICROINFORMÁTICA MENSAL',
      unit: 'MENSAL',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-10001',
    expectedDescription: 'manutencao ti',
    expectedUnit: 'MES',
    expectedType: 'servico',
    similarGroup: 'MANUTENCAO_TI',
  },
  {
    input: {
      id: 'BM-063',
      description: 'DESENVOLVIMENTO DE SISTEMA WEB CUSTOMIZADO',
      unit: 'SV',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-10002',
    expectedDescription: 'desenvolvimento software',
    expectedUnit: 'SV',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-064',
      description: 'HOSPEDAGEM DE SITE E DOMÍNIO ANUAL',
      unit: 'ANO',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATSER-10003',
    expectedDescription: 'hospedagem web',
    expectedUnit: 'ANO',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-065',
      description: 'LICENCIAMENTO SOFTWARE MICROSOFT 365 BUSINESS BASIC ANUAL',
      unit: 'ANO',
      source: 'comprasgov',
      uf: 'BA',
    },
    expectedCategory: 'CATSER-10004',
    expectedDescription: 'licenciamento software',
    expectedUnit: 'ANO',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-066',
      description: 'LINK INTERNET DEDICADO 100MBPS MENSAL',
      unit: 'MÊS',
      source: 'pncp',
      uf: 'PR',
    },
    expectedCategory: 'CATSER-10005',
    expectedDescription: 'internet dedicada',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-067',
      description: 'BACKUP EM NUVEM 1TB MENSAL',
      unit: 'MES',
      source: 'pncp',
      uf: 'SC',
    },
    expectedCategory: 'CATSER-10006',
    expectedDescription: 'backup nuvem',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - SERVIÇOS DE LIMPEZA (20.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-068',
      description: 'SERVIÇO DE LIMPEZA E CONSERVAÇÃO PREDIAL MENSAL',
      unit: 'MES',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-20001',
    expectedDescription: 'limpeza predial',
    expectedUnit: 'MES',
    expectedType: 'servico',
    similarGroup: 'LIMPEZA',
  },
  {
    input: {
      id: 'BM-069',
      description:
        'CONTRATAÇÃO DE EMPRESA ESPECIALIZADA EM ASSEIO E CONSERVAÇÃO',
      unit: 'MENSAL',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-20001',
    expectedDescription: 'limpeza predial',
    expectedUnit: 'MES',
    expectedType: 'servico',
    similarGroup: 'LIMPEZA',
  },
  {
    input: {
      id: 'BM-070',
      description: 'DEDETIZAÇÃO E CONTROLE DE PRAGAS URBANAS',
      unit: 'SV',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-20002',
    expectedDescription: 'dedetizacao',
    expectedUnit: 'SV',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-071',
      description: "LIMPEZA DE CAIXA D'ÁGUA E RESERVATÓRIOS",
      unit: 'SV',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATSER-20003',
    expectedDescription: 'limpeza caixa agua',
    expectedUnit: 'SV',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - VIGILÂNCIA E SEGURANÇA (25.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-072',
      description: 'SERVIÇO DE VIGILÂNCIA PATRIMONIAL ARMADA 24 HORAS',
      unit: 'POSTO',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-25001',
    expectedDescription: 'vigilancia patrimonial',
    expectedUnit: 'POSTO',
    expectedType: 'servico',
    similarGroup: 'VIGILANCIA',
  },
  {
    input: {
      id: 'BM-073',
      description: 'CONTRATAÇÃO DE EMPRESA DE SEGURANÇA PATRIMONIAL DESARMADA',
      unit: 'POSTO',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-25001',
    expectedDescription: 'vigilancia patrimonial',
    expectedUnit: 'POSTO',
    expectedType: 'servico',
    similarGroup: 'VIGILANCIA',
  },
  {
    input: {
      id: 'BM-074',
      description: 'MONITORAMENTO ELETRÔNICO CFTV 24H',
      unit: 'MES',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-25002',
    expectedDescription: 'monitoramento cftv',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-075',
      description: 'PORTARIA E RECEPÇÃO 12 HORAS DIURNO',
      unit: 'POSTO',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATSER-25003',
    expectedDescription: 'portaria',
    expectedUnit: 'POSTO',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - MANUTENÇÃO PREDIAL (30.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-076',
      description: 'MANUTENÇÃO PREDIAL PREVENTIVA E CORRETIVA',
      unit: 'MES',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-30001',
    expectedDescription: 'manutencao predial',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-077',
      description: 'SERVIÇO DE JARDINAGEM E PAISAGISMO',
      unit: 'MES',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-30002',
    expectedDescription: 'jardinagem',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-078',
      description: 'MANUTENÇÃO AR CONDICIONADO PREVENTIVA MENSAL',
      unit: 'MES',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-30003',
    expectedDescription: 'manutencao ar condicionado',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-079',
      description: 'MANUTENÇÃO ELEVADORES PREVENTIVA E CORRETIVA',
      unit: 'MES',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATSER-30004',
    expectedDescription: 'manutencao elevadores',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - TRANSPORTE E LOGÍSTICA (35.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-080',
      description: 'FRETE PARA TRANSPORTE DE CARGAS FRACIONADAS',
      unit: 'KG',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-35001',
    expectedDescription: 'frete cargas',
    expectedUnit: 'KG',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-081',
      description: 'LOCAÇÃO DE VEÍCULO SEM MOTORISTA SEDAN',
      unit: 'MES',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-35002',
    expectedDescription: 'locacao veiculo',
    expectedUnit: 'MES',
    expectedType: 'servico',
    similarGroup: 'LOCACAO_VEICULO',
  },
  {
    input: {
      id: 'BM-082',
      description: 'ALUGUEL DE AUTOMÓVEL TIPO HATCH COM COMBUSTÍVEL',
      unit: 'MENSAL',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-35002',
    expectedDescription: 'locacao veiculo',
    expectedUnit: 'MES',
    expectedType: 'servico',
    similarGroup: 'LOCACAO_VEICULO',
  },
  {
    input: {
      id: 'BM-083',
      description: 'SERVIÇO DE MOTOBOY PARA ENTREGAS URBANAS',
      unit: 'ENTREGA',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATSER-35003',
    expectedDescription: 'motoboy',
    expectedUnit: 'ENTREGA',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - CONSULTORIA E TREINAMENTO (40.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-084',
      description: 'CONSULTORIA EM GESTÃO PÚBLICA HORA TÉCNICA',
      unit: 'HORA',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-40001',
    expectedDescription: 'consultoria gestao',
    expectedUnit: 'H',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-085',
      description: 'ASSESSORIA JURÍDICA ESPECIALIZADA MENSAL',
      unit: 'MES',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-40002',
    expectedDescription: 'assessoria juridica',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-086',
      description: 'TREINAMENTO CAPACITAÇÃO SERVIDORES PRESENCIAL',
      unit: 'TURMA',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-40003',
    expectedDescription: 'treinamento capacitacao',
    expectedUnit: 'TURMA',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-087',
      description: 'CURSO EAD GESTÃO DE CONTRATOS 40 HORAS',
      unit: 'VAGA',
      source: 'pncp',
      uf: 'DF',
    },
    expectedCategory: 'CATSER-40004',
    expectedDescription: 'curso ead',
    expectedUnit: 'VAGA',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - EVENTOS E ALIMENTAÇÃO (45.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-088',
      description: 'COFFEE BREAK COMPLETO PARA 50 PESSOAS',
      unit: 'PESSOA',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-45001',
    expectedDescription: 'coffee break',
    expectedUnit: 'PESSOA',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-089',
      description: 'FORNECIMENTO DE REFEIÇÕES TRANSPORTADAS',
      unit: 'REFEICAO',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-45002',
    expectedDescription: 'refeicao',
    expectedUnit: 'REFEICAO',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-090',
      description: 'ORGANIZAÇÃO DE EVENTO CORPORATIVO COMPLETO',
      unit: 'EVENTO',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-45003',
    expectedDescription: 'organizacao evento',
    expectedUnit: 'EVENTO',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - IMPRESSÃO E GRÁFICA (50.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-091',
      description: 'IMPRESSÃO DE MATERIAL GRÁFICO COLORIDO A4',
      unit: 'MILHEIRO',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-50001',
    expectedDescription: 'impressao grafica',
    expectedUnit: 'MIL',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-092',
      description: 'OUTSOURCING DE IMPRESSÃO MENSAL',
      unit: 'MES',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-50002',
    expectedDescription: 'outsourcing impressao',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-093',
      description: 'PLOTAGEM DE PROJETOS A0 A1 A2',
      unit: 'M2',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-50003',
    expectedDescription: 'plotagem',
    expectedUnit: 'M2',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - OBRAS E ENGENHARIA (55.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-094',
      description: 'ELABORAÇÃO DE PROJETO ARQUITETÔNICO COMPLETO',
      unit: 'M2',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-55001',
    expectedDescription: 'projeto arquitetonico',
    expectedUnit: 'M2',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-095',
      description: 'FISCALIZAÇÃO DE OBRA PÚBLICA',
      unit: 'MES',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-55002',
    expectedDescription: 'fiscalizacao obra',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-096',
      description: 'LAUDO TÉCNICO ESTRUTURAL PERÍCIA',
      unit: 'SV',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-55003',
    expectedDescription: 'laudo tecnico',
    expectedUnit: 'SV',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - TELECOMUNICAÇÕES (60.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-097',
      description: 'TELEFONIA FIXA ILIMITADO BRASIL MENSAL',
      unit: 'LINHA',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-60001',
    expectedDescription: 'telefonia fixa',
    expectedUnit: 'LINHA',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-098',
      description: 'TELEFONIA MÓVEL CORPORATIVA 10GB',
      unit: 'LINHA',
      source: 'comprasgov',
      uf: 'RJ',
    },
    expectedCategory: 'CATSER-60002',
    expectedDescription: 'telefonia movel',
    expectedUnit: 'LINHA',
    expectedType: 'servico',
  },
  {
    input: {
      id: 'BM-099',
      description: 'VIDEOCONFERÊNCIA CORPORATIVA SALA 12 PESSOAS',
      unit: 'MES',
      source: 'pncp',
      uf: 'MG',
    },
    expectedCategory: 'CATSER-60003',
    expectedDescription: 'videoconferencia',
    expectedUnit: 'MES',
    expectedType: 'servico',
  },

  // ============================================================================
  // CATSER - SAÚDE OCUPACIONAL (65.xxx)
  // ============================================================================
  {
    input: {
      id: 'BM-100',
      description: 'EXAME MÉDICO ADMISSIONAL COMPLETO',
      unit: 'EXAME',
      source: 'pncp',
      uf: 'SP',
    },
    expectedCategory: 'CATSER-65001',
    expectedDescription: 'exame medico',
    expectedUnit: 'EXAME',
    expectedType: 'servico',
  },
];

/**
 * Items grouped by similarity for grouping accuracy tests.
 */
export const similarItemGroups: Record<string, string[]> = {
  NOTEBOOK: ['BM-001', 'BM-002', 'BM-003'],
  DESKTOP: ['BM-004', 'BM-005'],
  MONITOR: ['BM-006', 'BM-007'],
  IMPRESSORA: ['BM-008', 'BM-009'],
  PAPEL_A4: ['BM-013', 'BM-014', 'BM-015'],
  TONER: ['BM-016', 'BM-017'],
  CADEIRA: ['BM-024', 'BM-025'],
  MESA: ['BM-026', 'BM-027'],
  LAMPADA: ['BM-039', 'BM-040'],
  AR_CONDICIONADO: ['BM-044', 'BM-045'],
  MANUTENCAO_TI: ['BM-061', 'BM-062'],
  LIMPEZA: ['BM-068', 'BM-069'],
  VIGILANCIA: ['BM-072', 'BM-073'],
  LOCACAO_VEICULO: ['BM-081', 'BM-082'],
};

/**
 * Dataset statistics for reference.
 */
export const datasetStats = {
  total: 100,
  materials: 60,
  services: 40,
  regions: [
    'SP',
    'RJ',
    'MG',
    'DF',
    'BA',
    'PR',
    'SC',
    'RS',
    'GO',
    'PE',
    'CE',
    'AM',
  ],
  similarGroups: Object.keys(similarItemGroups).length,
  itemsInGroups: Object.values(similarItemGroups).flat().length,
};
