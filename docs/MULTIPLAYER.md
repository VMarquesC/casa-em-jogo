# Multiplayer

A ideia para o multiplayer é manter o jogo simples no começo e ir aumentando aos poucos.

## Primeira etapa

O básico seria ter uma sala com vários jogadores entrando na mesma casa e conseguindo se movimentar ao mesmo tempo.

Depois disso entram:

- chat;
- emotes;
- votação;
- líder e imunidade;
- festas;
- provas online;
- eliminação.

## Como pretendo organizar

O navegador vai continuar cuidando da parte visual do jogo, como mapa, interface, animações e controles.

Já as regras importantes da partida precisam ficar no servidor, principalmente:

- quem está conectado;
- quem é o líder;
- quem está imune;
- votos;
- cronômetros;
- vencedores das provas;
- eliminações.

Isso evita que cada jogador tenha uma versão diferente da partida.

## NPCs

Os NPCs ainda podem continuar úteis no multiplayer. Se uma sala tiver 8 vagas e entrarem só 5 pessoas, por exemplo, as outras 3 vagas podem ser preenchidas por bots.

A ideia é que jogador real e NPC usem a mesma estrutura de personagem. A diferença fica só em quem controla as ações.

## Ordem que quero testar

1. criar lobby;
2. entrar em uma sala;
3. mostrar outros jogadores no mapa;
4. sincronizar movimentação;
5. adicionar chat;
6. sincronizar o reality;
7. adaptar as provas;
8. tratar desconexão e reconexão.

Ainda é uma ideia para uma próxima fase do projeto, então essa estrutura pode mudar conforme eu for testando.
