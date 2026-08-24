# Releases e versionamento

O projeto usa versões no formato `vMAJOR.MINOR.PATCH`.

Exemplos:

- `v1.9.0` — funcionalidade importante nova;
- `v1.10.3` — correções dentro da mesma linha de versão;
- `v1.13.0` — reorganização estrutural relevante.

## Histórico antigo

As versões antigas devem ser importadas como estados reais do projeto, preferencialmente com:

1. arquivos da versão;
2. um commit descrevendo a mudança principal;
3. uma tag apontando para esse commit.

Exemplo:

```bash
git add -A
git commit -m "feat: adiciona prova do labirinto"
git tag v1.9.0
```

Depois de importar o histórico:

```bash
git push origin main
git push origin --tags
```

## Builds

Não é necessário colocar os ZIPs de cada build dentro do Git. O código e os assets ficam no repositório; builds empacotadas podem ser publicadas futuramente em GitHub Releases.

## Mensagens de commit

Padrões sugeridos:

- `feat:` funcionalidade nova;
- `fix:` correção de bug;
- `refactor:` reorganização sem mudança intencional de comportamento;
- `ui:` alterações de interface/visual;
- `docs:` documentação;
- `chore:` manutenção e configuração.

Exemplos:

```text
feat: adiciona sistema de festas
fix: corrige colisões do labirinto
refactor: separa javascript por responsabilidade
ui: melhora interface da prova
docs: adiciona roadmap do multiplayer
```

## Tags

Use tags apenas para versões que realmente existiram. Não é necessário criar uma tag para cada pequeno teste intermediário.
