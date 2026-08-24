# Casa em Jogo

Casa em Jogo é um jogo web de simulação de reality show. A ideia é combinar convivência, relações entre participantes, provas, liderança, imunidade, votação, eliminação e eventos especiais dentro da casa.

## Estado do projeto

O repositório está sendo preparado para receber o histórico das versões do jogo. A versão mais recente trabalhada localmente é a **V1.13.0 — Code Refactor**, que reorganiza o JavaScript em arquivos menores e prepara a base para uma futura fase multiplayer.

## Principais sistemas

- movimentação e colisões no mapa da casa;
- participantes controlados pelo jogador e por IA;
- relações, fofocas, alianças e confessionário;
- Líder, imunidade, votação e eliminação;
- prova do labirinto com cronômetro, colisão e pathfinding;
- festas na área de festa da própria casa;
- emotes, animações de estado e chat local;
- camada inicial de estado preparada para futura sincronização multiplayer.

## Tecnologias

- HTML
- CSS
- JavaScript
- Canvas 2D

## Estrutura planejada a partir da V1.13

```text
js/
├── core/
├── gameplay/
├── social/
├── reality/
├── characters/
├── challenges/
├── ui/
└── network/
```

A organização detalhada está em [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Roadmap

Os principais próximos passos estão em [`docs/ROADMAP.md`](docs/ROADMAP.md) e também nas Issues do repositório.

Entre os objetivos estão melhorar os sprites e animações, adicionar novas provas, polir as festas e evoluir gradualmente para multiplayer com servidor autoritativo.

## Histórico de versões

O histórico antigo será importado em commits e tags, preservando os estados reais que o projeto teve ao longo do desenvolvimento. Os arquivos ZIP das builds não devem ser versionados dentro do repositório.

Consulte [`docs/RELEASES.md`](docs/RELEASES.md) para o padrão de versionamento.

## Desenvolvimento

Antes de contribuir ou reorganizar arquivos, consulte [`CONTRIBUTING.md`](CONTRIBUTING.md).

---

Projeto em desenvolvimento.