# Arquitetura do Casa em Jogo

Este documento descreve a direção de organização adotada a partir da V1.13.0.

## Objetivo

Evitar que toda a lógica do jogo volte a crescer dentro de um único `game.js` e facilitar a futura migração para multiplayer.

## Responsabilidades

### `js/core/`
Inicialização do jogo, estado básico, loop principal, mapa e colisões da casa.

### `js/gameplay/`
Sistemas diretamente ligados às ações do jogador, objetivos, missões e poderes.

### `js/social/`
Conversas, relações, alianças, fofocas e interações sociais.

### `js/reality/`
Regras do reality: fluxo semanal, Líder, imunidade, votação, eliminação, confessionário, festas e eventos.

### `js/characters/`
Comportamentos dos participantes, estados de animação e IA dos bots.

### `js/challenges/`
Provas e arenas. Cada prova deve preferencialmente separar estado, navegação/regras e renderização quando crescer.

### `js/ui/`
HUD, modais, feed, renderização e elementos visuais que não devem decidir regras importantes da partida.

### `js/network/`
Camada destinada ao multiplayer: snapshots, sincronização, chat e comunicação futura via WebSocket.

## Princípio importante para multiplayer

No modo multiplayer, regras críticas não devem confiar apenas no navegador do jogador. O servidor deverá ser a autoridade para dados como:

- participantes conectados;
- posições válidas;
- cronômetros das provas;
- vencedor de prova;
- Líder e imunidade;
- votos;
- eliminação;
- estado da rodada.

O cliente deve ficar principalmente responsável por entrada do jogador, renderização, interface e animações.

## Bots e jogadores reais

A direção planejada é tratar os participantes por papel, em vez de criar sistemas totalmente separados:

- `local`: jogador desta máquina;
- `remote`: outro jogador sincronizado pelo servidor;
- `bot`: participante controlado pela IA.

Dessa forma, uma sala poderá futuramente misturar jogadores reais e bots.

## Refatoração incremental

A V1.13 ainda mantém dependências globais para não quebrar a gameplay durante a reorganização. A migração para módulos ES deve ser gradual e acompanhada de testes de inicialização e das provas.
