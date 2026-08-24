# Direção multiplayer

O multiplayer deve ser construído sem transformar o navegador do jogador na autoridade das regras.

## Cliente

Responsável principalmente por:

- teclado/controle;
- câmera;
- renderização do mapa;
- animações;
- interface;
- chat enviado pelo jogador;
- efeitos visuais e áudio.

## Servidor

Responsável por validar e distribuir:

- jogadores conectados;
- sala/temporada;
- posições válidas;
- fase atual;
- Líder e imunidade;
- votos;
- eliminações;
- início e fim das provas;
- cronômetros;
- vencedor das provas.

## Comunicação

WebSocket é uma opção adequada para sincronização em tempo real. Uma mensagem futura pode seguir um formato semelhante a:

```json
{
  "type": "player:move",
  "playerId": "p_123",
  "x": 420,
  "y": 280,
  "animState": "walk"
}
```

Eventos de regra devem ser confirmados pelo servidor antes de se tornarem oficiais.

## Salas híbridas

Objetivo futuro:

```text
8 vagas
├── jogadores reais
└── bots preenchendo vagas vazias
```

Bots e jogadores devem compartilhar a mesma representação de participante sempre que possível. O que muda é quem fornece as decisões e posições.

## Segurança básica

Nunca confiar no cliente para ações como:

```text
"eu ganhei a prova"
"eu sou o líder"
"meu voto vale 100"
"meu personagem está nesta posição impossível"
```

O cliente pede; o servidor valida; o servidor atualiza a partida.

## Ordem recomendada

1. lobby e salas;
2. conexão WebSocket;
3. jogadores remotos aparecendo na casa;
4. posição/animação;
5. chat;
6. estado semanal;
7. votação;
8. festas;
9. provas sincronizadas;
10. reconexão e tratamento de abandono.
