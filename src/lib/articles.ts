export type ArticleSection = { heading: string; body: string[] };

export type Article = {
  slug: string;
  title: string;
  description: string;
  h1: string;
  excerpt: string;
  author: string;
  publishedAt: string; // ISO
  updatedAt: string; // ISO
  readingMinutes: number;
  tags: string[];
  intro: string;
  sections: ArticleSection[];
  faqs: { q: string; a: string }[];
  related?: string[]; // ideias slugs
};

export const ARTICLES: Article[] = [
  {
    slug: "como-escolher-brindes-corporativos",
    title: "Como escolher brindes corporativos: guia definitivo 2026 | BrindesHub",
    description:
      "Aprenda a escolher brindes corporativos que fortalecem sua marca: público, orçamento, MOQ, personalização, prazos e checklist prático para acertar na compra.",
    h1: "Como escolher brindes corporativos que realmente funcionam",
    excerpt:
      "Um guia prático, com critérios objetivos e checklist, para escolher brindes que geram valor real para a marca — sem desperdício de verba.",
    author: "Equipe BrindesHub",
    publishedAt: "2026-01-10T09:00:00.000Z",
    updatedAt: "2026-07-01T09:00:00.000Z",
    readingMinutes: 8,
    tags: ["guia", "compras", "marketing"],
    intro:
      "Escolher brindes corporativos vai muito além de pegar o item mais barato do catálogo. Uma boa escolha combina público, ocasião, orçamento e mensagem de marca. Neste guia você encontra um método passo a passo, com armadilhas comuns e um checklist final para negociar com fornecedores.",
    sections: [
      {
        heading: "1. Defina o público e a ocasião",
        body: [
          "Antes de qualquer coisa, descreva quem vai receber o brinde e em qual contexto. Um kit para executivos C-level em um evento fechado exige acabamento e personalização muito superiores ao de uma ação de rua para captação de leads.",
          "Considere também idade, cargo, região e afinidade com sua marca. Brindes genéricos tendem a ser esquecidos; brindes contextuais viram objeto de desejo.",
        ],
      },
      {
        heading: "2. Alinhe orçamento por unidade e volume (MOQ)",
        body: [
          "Divida o orçamento total pela quantidade estimada e chegue ao custo-alvo por unidade. Lembre-se de somar personalização, embalagem e frete.",
          "Fornecedores trabalham com quantidade mínima (MOQ). Peças muito personalizadas costumam ter MOQ maior. Use nossos filtros de MOQ máximo em /buscar para encontrar apenas fornecedores compatíveis.",
        ],
      },
      {
        heading: "3. Personalização: técnica certa para o material",
        body: [
          "Cada material tem uma técnica ideal: silk-screen para tecidos claros, sublimação para poliéster, laser para metais, tampografia para plásticos, bordado para peças de alto valor percebido.",
          "Solicite sempre um mockup digital antes de aprovar a produção e confirme cores em Pantone quando a identidade visual for crítica.",
        ],
      },
      {
        heading: "4. Prazo de produção e logística",
        body: [
          "Prazos típicos vão de 5 a 25 dias úteis após aprovação da arte. Ações sazonais (Natal, Dia do Cliente, feiras) exigem antecipação de 45 a 60 dias.",
          "No BrindesHub você filtra por prazo máximo de produção e estado da empresa, reduzindo risco logístico e prazo de entrega.",
        ],
      },
      {
        heading: "5. Sustentabilidade e propósito",
        body: [
          "Brindes sustentáveis — bambu, algodão orgânico, plástico reciclado, sementes — comunicam propósito e têm alta taxa de retenção. Veja opções no nosso guia de brindes sustentáveis.",
        ],
      },
      {
        heading: "6. Checklist final antes de fechar",
        body: [
          "• Público, ocasião e mensagem claros\n• Orçamento por unidade calculado com frete e personalização\n• MOQ compatível com a demanda\n• Mockup aprovado com cores Pantone\n• Prazo com folga de 20% sobre a data crítica\n• Empresa verificada com avaliações positivas\n• Contrato ou pedido formal com condições de reposição",
        ],
      },
    ],
    faqs: [
      {
        q: "Qual o valor médio de um brinde corporativo?",
        a: "Varia de R$ 3 a R$ 300+ por unidade. Ações massivas ficam entre R$ 5 e R$ 25; kits executivos entre R$ 80 e R$ 300.",
      },
      {
        q: "Quanto tempo antes devo pedir os brindes?",
        a: "Recomendamos 30 dias para pedidos padrão e 45–60 dias para volumes grandes ou datas críticas como Natal e feiras.",
      },
      {
        q: "Consigo brindes personalizados em baixa quantidade?",
        a: "Sim. Use o filtro 'MOQ máximo' na busca para encontrar fornecedores que aceitam quantidades reduzidas.",
      },
    ],
    related: ["brindes-para-eventos", "brindes-sustentaveis", "brindes-baratos"],
  },
  {
    slug: "brindes-personalizados-por-segmento",
    title: "Brindes personalizados por segmento: ideias que convertem | BrindesHub",
    description:
      "Ideias de brindes personalizados por segmento de mercado: tecnologia, saúde, educação, imobiliário, financeiro e varejo — com exemplos e faixas de preço.",
    h1: "Brindes personalizados por segmento de mercado",
    excerpt:
      "Um brinde relevante conversa com o dia a dia do cliente. Veja recomendações certeiras por setor, com faixa de preço e nível de personalização.",
    author: "Equipe BrindesHub",
    publishedAt: "2026-02-14T09:00:00.000Z",
    updatedAt: "2026-06-20T09:00:00.000Z",
    readingMinutes: 7,
    tags: ["ideias", "segmentos", "personalização"],
    intro:
      "Brindes que se conectam à rotina do cliente têm taxa de uso muito superior à média. Este guia agrupa recomendações por setor, com foco em utilidade percebida e coerência de marca.",
    sections: [
      {
        heading: "Tecnologia e SaaS",
        body: [
          "Powerbanks, mousepads XL, hubs USB-C, cadernos com QR-code, camisetas com tipografia técnica. Faixa: R$ 15 a R$ 120. Personalização por laser ou silk.",
        ],
      },
      {
        heading: "Saúde e bem-estar",
        body: [
          "Squeezes de inox, ecobags, kits aromaterapia, agendas de auto-cuidado, luminárias. Faixa: R$ 12 a R$ 90. Priorize materiais atóxicos e certificados.",
        ],
      },
      {
        heading: "Educação",
        body: [
          "Kits escolares, canetas premium, cadernos de anotações, mochilas, marcadores de página. Faixa: R$ 5 a R$ 60.",
        ],
      },
      {
        heading: "Imobiliário",
        body: [
          "Chaveiros metálicos, jogos de ferramentas compactos, kits de vinho e queijos, cortadores de pizza personalizados para clientes que acabaram de mudar. Faixa: R$ 20 a R$ 250.",
        ],
      },
      {
        heading: "Financeiro e jurídico",
        body: [
          "Canetas metálicas, agendas de couro sintético, porta-cartões, kits gourmet. Alto acabamento é regra. Faixa: R$ 40 a R$ 300.",
        ],
      },
      {
        heading: "Varejo e e-commerce",
        body: [
          "Ecobags, adesivos, cartões de agradecimento personalizados, mini-brindes surpresa no unboxing. Faixa: R$ 1 a R$ 20 por unidade.",
        ],
      },
    ],
    faqs: [
      {
        q: "Como saber se o brinde combina com meu público?",
        a: "Teste com uma amostra pequena antes de escalar. Peça feedback qualitativo em 2 semanas.",
      },
      {
        q: "Vale a pena investir em brinde premium para poucos clientes?",
        a: "Sim, especialmente em contas estratégicas (ABM). O ROI vem da retenção e da percepção de marca.",
      },
    ],
    related: ["brindes-tecnologia", "brindes-para-eventos"],
  },
  {
    slug: "tendencias-brindes-2026",
    title: "Tendências de brindes corporativos em 2026 | BrindesHub",
    description:
      "As principais tendências de brindes corporativos em 2026: sustentabilidade, kits temáticos, experiências, personalização em escala e brindes tech.",
    h1: "Tendências de brindes corporativos em 2026",
    excerpt:
      "O mercado de brindes evoluiu: menos volume, mais significado. Veja o que separa marcas líderes das que ficaram para trás em 2026.",
    author: "Equipe BrindesHub",
    publishedAt: "2026-03-05T09:00:00.000Z",
    updatedAt: "2026-07-10T09:00:00.000Z",
    readingMinutes: 6,
    tags: ["tendências", "2026", "estratégia"],
    intro:
      "Menos e melhor. Essa é a síntese do que vemos no mercado B2B de brindes em 2026. A pressão por ESG, personalização em escala e experiências memoráveis redefiniu o que faz um brinde ter sucesso.",
    sections: [
      {
        heading: "Sustentabilidade deixou de ser diferencial",
        body: [
          "Compradores corporativos hoje exigem rastreabilidade de origem e certificações. Bambu, algodão orgânico e plástico reciclado dominam os catálogos.",
        ],
      },
      {
        heading: "Kits temáticos superam brindes avulsos",
        body: [
          "Kits contextuais (welcome kit, home office, aniversariante) geram engajamento superior. Explore kits prontos em /kits.",
        ],
      },
      {
        heading: "Personalização em escala com print-on-demand",
        body: [
          "Tecnologias de impressão digital viabilizam nomes individuais em pedidos de centenas de unidades, sem estourar o orçamento.",
        ],
      },
      {
        heading: "Brindes tech e híbridos",
        body: [
          "Carregadores wireless, dispositivos de anotação inteligente, notebooks com NFC embutido. Alto valor percebido e uso diário.",
        ],
      },
      {
        heading: "Experiências no lugar do objeto",
        body: [
          "Vouchers digitais, degustações, cursos e assinaturas ganham espaço em campanhas premium.",
        ],
      },
    ],
    faqs: [
      {
        q: "Vale abandonar brindes físicos?",
        a: "Não. O físico ainda gera memória tátil. Combine com experiências digitais para maximizar impacto.",
      },
    ],
    related: ["brindes-sustentaveis", "brindes-tecnologia"],
  },
];

export function findArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
