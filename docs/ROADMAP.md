# Roadmap

Este roadmap organiza a evolução do Casa em Jogo sem obrigar uma ordem rígida de implementação.

## Curto prazo

- estabilizar a gameplay atual;
- preservar o labirinto sem regressões de colisão/pathfinding;
- melhorar sprites e animações;
- polir festas e interações visuais;
- manter o código dividido por responsabilidade;
- importar o histórico das versões antigas com commits e tags.

## Novas provas

Candidatas para próximas arenas:

- corrida de obstáculos;
- jogo da memória;
- resistência;
- caça a itens/bandeiras;
- piso falso;
- quiz sobre acontecimentos da temporada.

Todas devem permitir que jogador e bots participem sob as mesmas regras.

## Multiplayer

### Fase 1 — Fundação
- separar regras críticas da renderização;
- consolidar IDs dos participantes;
- definir formato de snapshot da partida;
- preparar comunicação WebSocket.

### Fase 2 — Sala online
- lobby;
- criação/entrada em salas;
- jogadores remotos aparecendo na casa;
- sincronização de posição e animação;
- chat em tempo real.

### Fase 3 — Reality sincronizado
- Líder;
- imunidade;
- votação;
- eliminação;
- confessionário e eventos;
- festas sincronizadas.

### Fase 4 — Provas online
- cronômetro controlado pelo servidor;
- validação de chegada/pontuação;
- vencedor autoritativo;
- retorno sincronizado à casa.

### Fase 5 — Salas híbridas
- preencher vagas vazias com bots;
- substituir bots por jogadores quando aplicável;
- manter modo single-player como ambiente de teste.

## Qualidade

- testes de inicialização;
- testes de colisão com máscaras reais;
- validação automática de caminho início → objetivo em arenas;
- evitar erros de estado entre troca de fases;
- manter UI longe de áreas importantes das provas.
