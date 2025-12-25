import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  Legislation,
  LegislationType,
} from '../src/entities/legislation.entity';
import { RAGService } from '../src/modules/rag/rag.service';
import { ConfigService } from '@nestjs/config';

config();

/**
 * Seed script for Lei 14.133/2021 (Nova Lei de Licitações).
 * Populates the RAG database with key articles for fact-checking.
 *
 * Usage: npm run seed:legislation
 *
 * @see Issue #211 - PoC RAG com Lei 14.133/2021
 */

const LEI_14133_DATA = {
  type: LegislationType.LEI,
  number: '14.133',
  year: 2021,
  title:
    'Lei de Licitações e Contratos Administrativos - Nova Lei de Licitações',
  sourceUrl:
    'https://www.planalto.gov.br/ccivil_03/_ato2019-2022/2021/lei/L14133.htm',
  content: `
Lei nº 14.133, de 1º de abril de 2021

Dispõe sobre licitações e contratos administrativos.

O PRESIDENTE DA REPÚBLICA
Faço saber que o Congresso Nacional decreta e eu sanciono a seguinte Lei:

TÍTULO I
DISPOSIÇÕES GERAIS

Art. 1º Esta Lei estabelece normas gerais de licitação e contratação para as
Administrações Públicas diretas, autárquicas e fundacionais da União, dos Estados,
do Distrito Federal e dos Municípios, e abrange os órgãos dos Poderes Legislativo e
Judiciário da União, dos Estados e do Distrito Federal e os órgãos do Poder Legislativo
dos Municípios, quando no desempenho de função administrativa.

Art. 2º As contratações diretas e indiretas de obras, serviços, inclusive de engenharia,
fornecimentos e alienações realizadas por órgãos, entidades e fundos especiais será
observado o disposto nesta Lei.

Art. 3º Os processos licitatórios e as contratações deles decorrentes deverão observar
os princípios da legalidade, da impessoalidade, da moralidade, da publicidade, da
eficiência, do interesse público, da probidade administrativa, da igualdade, do
planejamento, da transparência, da eficácia, da segregação de funções, da motivação,
da vinculação ao edital, do julgamento objetivo, da segurança jurídica, da razoabilidade,
da competitividade, da proporcionalidade, da celeridade, da economicidade e do
desenvolvimento nacional sustentável.
 `,
  articles: [
    {
      number: '1',
      content:
        'Esta Lei estabelece normas gerais de licitação e contratação para as Administrações Públicas diretas, autárquicas e fundacionais da União, dos Estados, do Distrito Federal e dos Municípios.',
    },
    {
      number: '2',
      content:
        'As contratações diretas e indiretas de obras, serviços, inclusive de engenharia, fornecimentos e alienações realizadas por órgãos, entidades e fundos especiais será observado o disposto nesta Lei.',
    },
    {
      number: '3',
      content:
        'Os processos licitatórios e as contratações deles decorrentes deverão observar os princípios da legalidade, da impessoalidade, da moralidade, da publicidade, da eficiência, do interesse público, da probidade administrativa, da igualdade, do planejamento, da transparência.',
    },
    {
      number: '6',
      content:
        'As licitações serão realizadas preferencialmente sob a forma eletrônica, admitida excepcionalmente a presencial, desde que motivada.',
    },
    {
      number: '12',
      content:
        'A Administração poderá condicionar a participação de licitante pessoa jurídica à comprovação de que uma parcela mínima de sua mão de obra seja formada por mulheres vítimas de violência doméstica.',
    },
    {
      number: '18',
      content:
        'As licitações realizar-se-ão nas modalidades: pregão, concorrência, concurso, leilão e diálogo competitivo.',
    },
    {
      number: '28',
      content:
        'É dispensável a licitação quando se tratar de contratação que tenha por objeto: I - aquisição de materiais, equipamentos ou gêneros que só possam ser fornecidos por produtor, empresa ou representante comercial exclusivo.',
    },
    {
      number: '29',
      content:
        'Nas contratações diretas, a escolha do contratado deverá ser motivada e precedida de pesquisa de mercado, de modo a assegurar a contratação mais vantajosa para a Administração.',
    },
    {
      number: '75',
      subsection: 'II',
      content:
        'O termo de referência é o documento que deverá conter os elementos técnicos capazes de propiciar a avaliação do custo pela Administração, diante de orçamento detalhado, considerando os preços praticados no mercado, a definição dos métodos e o prazo de execução do objeto.',
    },
    {
      number: '91',
      content:
        'O contrato deverá conter cláusula que estabeleça prazo de vigência, admitida prorrogação se houver previsão neste sentido no edital.',
    },
    {
      number: '104',
      content:
        'Os contratos poderão ser alterados nas seguintes hipóteses: I - acréscimo ou supressão quantitativa de seu objeto em até 25% do valor inicial atualizado do contrato.',
    },
    {
      number: '137',
      content:
        'A Administração poderá, por ato próprio, rescindir o contrato nas seguintes hipóteses: I - quando o contratado não cumprir as obrigações contratuais; II - se o contratado der causa à inexecução parcial do contrato.',
    },
    {
      number: '156',
      content:
        'Aplicam-se às licitações e aos contratos regidos por esta Lei as sanções previstas na Lei nº 8.429, de 2 de junho de 1992 (Lei de Improbidade Administrativa).',
    },
    {
      number: '174',
      content:
        'Esta Lei entra em vigor após decorridos 2 (dois) anos de sua publicação oficial.',
    },
  ],
};

async function seedLegislation() {
  console.log('Starting legislation seed script...');

  // Create DataSource
  const dataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL,
    entities: [Legislation],
    synchronize: false,
    logging: false,
    // SSL Configuration (#598) - Use ssl: true for proper certificate validation
    ssl: process.env.NODE_ENV === 'production' ? true : false,
  });

  try {
    await dataSource.initialize();
    console.log('✅ Database connection established');

    const legislationRepository = dataSource.getRepository(Legislation);

    // Check if Lei 14.133/2021 already exists
    const existing = await legislationRepository.findOne({
      where: {
        type: LEI_14133_DATA.type,
        number: LEI_14133_DATA.number,
        year: LEI_14133_DATA.year,
      },
    });

    if (existing) {
      console.log(
        '⚠ Lei 14.133/2021 already exists in database. Skipping seed.',
      );
      await dataSource.destroy();
      return;
    }

    // Create legislation entity
    const legislation = legislationRepository.create({
      type: LEI_14133_DATA.type,
      number: LEI_14133_DATA.number,
      year: LEI_14133_DATA.year,
      title: LEI_14133_DATA.title,
      content: LEI_14133_DATA.content,
      articles: LEI_14133_DATA.articles,
      sourceUrl: LEI_14133_DATA.sourceUrl,
      isActive: true,
    });

    console.log('Creating legislation entry...');

    // Save without embedding first
    const savedLegislation = await legislationRepository.save(legislation);

    console.log(
      `✅ Legislation saved: ${savedLegislation.getFormattedReference()}`,
    );

    // Generate and update embedding
    console.log('Generating OpenAI embedding...');

    const configService = new ConfigService();
    const ragService = new RAGService(legislationRepository, configService);

    const indexed = await ragService.indexLegislation(savedLegislation);

    console.log('✅ Embedding generated and saved');
    console.log('\nSummary:');
    console.log(` ID: ${indexed.id}`);
    console.log(` Reference: ${indexed.getFormattedReference()}`);
    console.log(` Title: ${indexed.title}`);
    console.log(` Articles: ${indexed.articles?.length || 0}`);
    console.log(` Has embedding: ${!!indexed.embedding}`);

    console.log('\nSeed completed successfully!');
  } catch (error) {
    console.error('Error during seed:', error);
    throw error;
  } finally {
    await dataSource.destroy();
    console.log('Database connection closed');
  }
}

// Run seed
seedLegislation()
  .then(() => {
    console.log('\nAll done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nFatal error:', error);
    process.exit(1);
  });
