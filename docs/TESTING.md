# Checklist de testes

Use este checklist antes de considerar uma versão estável.

## Inicialização
- [ ] Página abre sem erro fatal
- [ ] Tela inicial responde
- [ ] Partida inicia
- [ ] Os 8 participantes aparecem
- [ ] Não há erro relevante no console

## Casa
- [ ] Player anda nas áreas abertas
- [ ] Player não atravessa paredes/móveis
- [ ] NPCs não ficam presos por longos períodos
- [ ] NPCs conseguem trocar de áreas da casa
- [ ] Confessionário funciona

## Reality
- [ ] Fluxo semanal avança
- [ ] Líder pode ser player ou NPC
- [ ] Líder recebe imunidade quando aplicável
- [ ] Votação considera participantes elegíveis
- [ ] Eliminação remove o participante corretamente
- [ ] Estados temporários são limpos entre fases

## Festa
- [ ] Participantes chegam à área da festa
- [ ] Animações/emotes não cobrem informações importantes
- [ ] Festa termina e devolve o jogo ao fluxo normal

## Labirinto
- [ ] Todos nascem em área caminhável
- [ ] Contagem 3-2-1 termina
- [ ] Cronômetro diminui
- [ ] Player consegue percorrer o caminho válido
- [ ] NPCs saem da largada
- [ ] NPCs recalculam rota quando presos
- [ ] Atalhos proibidos continuam bloqueados
- [ ] Pelo menos um participante consegue chegar à saída
- [ ] Vencedor é registrado
- [ ] Todos retornam à casa após o encerramento

## Multiplayer (quando implementado)
- [ ] Servidor é autoridade das regras críticas
- [ ] Clientes não conseguem definir Líder/vencedor localmente
- [ ] Posições remotas são sincronizadas
- [ ] Chat funciona entre clientes
- [ ] Desconexões não quebram a sala
- [ ] Cronômetros são sincronizados
