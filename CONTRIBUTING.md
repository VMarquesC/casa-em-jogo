# Contribuindo com Casa em Jogo

## Antes de começar

O projeto está em desenvolvimento ativo e passando por reorganização estrutural. Evite alterações grandes em várias áreas ao mesmo tempo sem necessidade.

## Fluxo recomendado

1. crie uma branch para a mudança;
2. faça alterações pequenas e focadas;
3. teste a inicialização do jogo;
4. teste a funcionalidade afetada;
5. verifique troca de fases quando aplicável;
6. faça commit com mensagem clara;
7. abra um Pull Request quando o fluxo colaborativo estiver sendo usado.

## Organização

Procure editar o arquivo responsável pelo sistema em vez de adicionar tudo em um arquivo genérico.

- mapa/colisões: `js/core/`
- gameplay: `js/gameplay/`
- diálogos/relações: `js/social/`
- reality/festa/votação: `js/reality/`
- NPCs/personagens: `js/characters/`
- provas: `js/challenges/`
- interface: `js/ui/`
- multiplayer/chat: `js/network/`

## Ao alterar colisões

- não valide apenas visualmente;
- teste o player;
- teste todos os NPCs;
- use a máscara real da arena;
- confirme que existe rota até o objetivo;
- verifique se o spawn não está dentro de uma hitbox inválida.

## Ao criar uma prova

Uma prova deve ter claramente:

- estado inicial;
- participantes elegíveis;
- começo da prova;
- cronômetro quando necessário;
- regra de vitória/derrota;
- encerramento;
- retorno para a casa;
- limpeza do estado temporário.

## Multiplayer

Evite criar novas regras críticas que dependam exclusivamente do cliente. Sistemas novos devem ser pensados para permitir que futuramente o servidor controle o estado autoritativo.
