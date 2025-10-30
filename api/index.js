require('dotenv').config();
const express = require('express');
const { paymentMiddleware } = require('x402-express');

const app = express();

const payTo = process.env.SERVER_PAY_TO_ADDRESS;
const facilitator = process.env.X402_FACILITATOR_URL || 'https://x402.org/facilitator';

// Middleware para JSON
app.use(express.json());

// === DADOS DE CIDADES ===
const cidades = {
  'sp': { nome: 'São Paulo', temp: 25, condicao: '☀️ Ensolarado' },
  'rj': { nome: 'Rio de Janeiro', temp: 28, condicao: '⛅ Parcialmente nublado' },
  'bh': { nome: 'Belo Horizonte', temp: 23, condicao: '🌧️ Chuva leve' },
  'brasilia': { nome: 'Brasília', temp: 24, condicao: '☁️ Nublado' },
  'salvador': { nome: 'Salvador', temp: 30, condicao: '☀️ Sol forte' },
  'recife': { nome: 'Recife', temp: 29, condicao: '⛅ Ensolarado' }
};

// === FUNÇÃO HELPER ===
function getClimaAleatorio(cidade = 'sp') {
  const dados = cidades[cidade.toLowerCase()] || cidades['sp'];
  const variacaoTemp = Math.floor(Math.random() * 5) - 2;
  
  return {
    cidade: dados.nome,
    temperatura: dados.temp + variacaoTemp,
    condicao: dados.condicao,
    umidade: Math.floor(Math.random() * 40) + 50,
    vento: Math.floor(Math.random() * 20) + 5,
    timestamp: new Date().toISOString()
  };
}

// === ROTAS PROTEGIDAS COM X402 ===
if (payTo) {
  app.use(paymentMiddleware(payTo, {
    "GET /api/clima": {
      price: "$0.01",
      network: "base-sepolia",
      description: "Dados de clima em tempo real"
    },
    "GET /api/clima/detalhado": {
      price: "$0.01",
      network: "base-sepolia",
      description: "Previsão detalhada de 7 dias"
    },
    "GET /api/clima/alertas": {
      price: "$0.01",
      network: "base-sepolia",
      description: "Alertas meteorológicos"
    }
  }, { url: facilitator }));
}

// === ROTAS DA API ===

// Rota raiz - Bem-vindo
app.get("/", (req, res) => {
  res.json({
    nome: "API Clima X402",
    versao: "1.0.0",
    status: "online",
    rotas: {
      gratis: [
        "GET /api/cidades",
        "GET /health"
      ],
      pagas: [
        "GET /api/clima?cidade=sp ($0.01)",
        "GET /api/clima/detalhado?cidade=rj ($0.01)",
        "GET /api/clima/alertas?cidade=bh ($0.01)"
      ]
    },
    documentacao: "Adicione ?cidade=sp para escolher a cidade"
  });
});

// Rota 1: Clima básico
app.get("/api/clima", (req, res) => {
  const cidade = req.query.cidade || 'sp';
  const clima = getClimaAleatorio(cidade);
  const payment = req.x402Payment;
  
  res.json({
    ...clima,
    pagamento: {
      transacao: payment?.transactionHash || 'N/A',
      valor: '$0.01'
    }
  });
});

// Rota 2: Clima detalhado (7 dias)
app.get("/api/clima/detalhado", (req, res) => {
  const cidade = req.query.cidade || 'sp';
  const payment = req.x402Payment;
  
  const previsao = Array.from({ length: 7 }, (_, i) => {
    const data = new Date();
    data.setDate(data.getDate() + i);
    return {
      dia: data.toLocaleDateString('pt-BR'),
      ...getClimaAleatorio(cidade)
    };
  });
  
  res.json({
    cidade: cidades[cidade.toLowerCase()]?.nome || 'São Paulo',
    previsao7dias: previsao,
    pagamento: {
      transacao: payment?.transactionHash || 'N/A',
      valor: '$0.01'
    }
  });
});

// Rota 3: Alertas meteorológicos
app.get("/api/clima/alertas", (req, res) => {
  const cidade = req.query.cidade || 'sp';
  const payment = req.x402Payment;
  
  const alertas = [
    { tipo: 'chuva', nivel: 'baixo', mensagem: 'Possibilidade de chuva à tarde' },
    { tipo: 'vento', nivel: 'médio', mensagem: 'Ventos fortes esperados' }
  ];
  
  res.json({
    cidade: cidades[cidade.toLowerCase()]?.nome || 'São Paulo',
    alertas,
    ativo: alertas.length > 0,
    pagamento: {
      transacao: payment?.transactionHash || 'N/A',
      valor: '$0.01'
    }
  });
});

// Rota pública: Lista de cidades
app.get("/api/cidades", (req, res) => {
  res.json({
    cidades: Object.keys(cidades),
    total: Object.keys(cidades).length,
    info: 'Use ?cidade=sp nas rotas protegidas'
  });
});

// Rota de saúde
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    servico: "API Clima X402"
  });
});

// Exporta para Vercel
module.exports = app;