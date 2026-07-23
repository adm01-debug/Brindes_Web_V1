export type Intent = {
  slug: string;
  title: string;
  h1: string;
  description: string;
  intro: string;
  query?: string;
  categoria?: string;
  material?: string;
  cor?: string;
  max?: number;
  moq?: number;
  faqs: { q: string; a: string }[];
};

export const INTENTS: Intent[] = [
  {
    slug: "brindes-para-eventos",
    title: "Brindes para eventos corporativos personalizados | BrindesHub",
    h1: "Brindes para eventos corporativos",
    description:
      "Ideias de brindes personalizados para eventos, congressos, feiras e confraternizações. Cotação rápida com fornecedores verificados.",
    intro:
      "Selecionamos brindes que funcionam bem em eventos corporativos: úteis, memoráveis e com bom custo por unidade em grandes volumes.",
    query: "evento",
    faqs: [
      {
        q: "Qual o prazo médio de produção para brindes de evento?",
        a: "A maioria dos fornecedores entrega entre 10 e 20 dias úteis após aprovação da arte. Para eventos, recomendamos iniciar a cotação com pelo menos 30 dias de antecedência.",
      },
      {
        q: "Existe pedido mínimo?",
        a: "Sim, o MOQ varia por produto e fornecedor — normalmente a partir de 50 a 100 unidades. Use o filtro de quantidade mínima na busca.",
      },
    ],
  },
  {
    slug: "brindes-sustentaveis",
    title: "Brindes sustentáveis e ecológicos personalizados | BrindesHub",
    h1: "Brindes sustentáveis e ecológicos",
    description:
      "Brindes ecológicos personalizados: bambu, algodão orgânico, materiais reciclados e reutilizáveis. Reforce o posicionamento ESG da sua marca.",
    intro:
      "Materiais renováveis, recicláveis ou de baixo impacto ambiental — ideais para marcas comprometidas com pautas ESG.",
    query: "sustentável",
    material: "algodão",
    faqs: [
      {
        q: "Os brindes têm certificação ambiental?",
        a: "Muitos fornecedores oferecem produtos com certificações como FSC, GOTS ou selos de reciclagem. Confirme diretamente no orçamento.",
      },
    ],
  },
  {
    slug: "brindes-de-tecnologia",
    title: "Brindes de tecnologia personalizados | BrindesHub",
    h1: "Brindes tecnológicos personalizados",
    description:
      "Power banks, carregadores, fones, mouse pads e acessórios tech personalizados com sua marca para eventos e clientes VIP.",
    intro:
      "Brindes tecnológicos têm alta percepção de valor e uso recorrente — excelentes para campanhas premium e clientes B2B.",
    query: "tecnologia",
    faqs: [
      {
        q: "Os produtos eletrônicos possuem garantia?",
        a: "Sim, a maioria vem com garantia mínima de 3 meses. Solicite detalhes na cotação com cada fornecedor.",
      },
    ],
  },
  {
    slug: "brindes-para-natal",
    title: "Brindes de Natal corporativos personalizados | BrindesHub",
    h1: "Brindes corporativos de Natal",
    description:
      "Kits de Natal, panetones personalizados, canecas temáticas e presentes de fim de ano para clientes e colaboradores.",
    intro:
      "Faça sua ação de fim de ano com brindes memoráveis: kits gourmet, canecas, agendas e itens temáticos.",
    query: "natal",
    faqs: [
      {
        q: "Quando devo iniciar a cotação de brindes de Natal?",
        a: "Recomendamos iniciar entre agosto e setembro para garantir estoque e prazos de entrega antes das confraternizações.",
      },
    ],
  },
  {
    slug: "brindes-baratos",
    title: "Brindes personalizados baratos em grandes quantidades | BrindesHub",
    h1: "Brindes personalizados em conta",
    description:
      "Brindes com ótimo custo-benefício para grandes tiragens: canetas, chaveiros, blocos e itens promocionais até R$ 10.",
    intro:
      "Ideais para campanhas de massa, feiras e ativações de marca. Selecionamos brindes com preço unitário atrativo.",
    max: 10,
    faqs: [
      {
        q: "Consigo desconto por volume?",
        a: "Sim, praticamente todos os fornecedores oferecem preço regressivo por faixa de quantidade. Informe o volume na cotação.",
      },
    ],
  },
  {
    slug: "brindes-para-feiras",
    title: "Brindes para feiras e congressos personalizados | BrindesHub",
    h1: "Brindes para feiras e congressos",
    description:
      "Ecobags, canetas, blocos, badges e brindes rápidos de distribuir em estandes de feiras e congressos.",
    intro:
      "Brindes práticos para ativação em estandes: leves, fáceis de transportar e com boa visibilidade da sua marca.",
    query: "feira",
    faqs: [
      {
        q: "Qual quantidade média para uma feira?",
        a: "Depende do porte — feiras médias giram entre 500 e 3.000 unidades por dia de estande.",
      },
    ],
  },
];

export function findIntent(slug: string): Intent | undefined {
  return INTENTS.find((i) => i.slug === slug);
}
