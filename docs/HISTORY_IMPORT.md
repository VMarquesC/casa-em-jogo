# Importando o histórico antigo

Este guia serve para reconstruir o histórico das versões reais do Casa em Jogo no Git.

## 1. Clone o repositório

```bash
git clone https://github.com/VMarquesC/casa-em-jogo.git
cd casa-em-jogo
```

## 2. Preserve a pasta `.git`

A partir daqui, nunca apague a pasta oculta `.git`. Ela é o histórico do repositório.

## 3. Comece pela versão mais antiga disponível

Copie para a pasta do repositório os arquivos da versão mais antiga que deseja preservar. Não copie o ZIP; extraia o conteúdo.

Confira:

```bash
git status
```

Depois:

```bash
git add -A
git commit -m "feat: adiciona versão inicial do Casa em Jogo"
git tag vX.Y.Z
```

Troque `vX.Y.Z` pela versão correta.

## 4. Passe para a versão seguinte

Apague/substitua os arquivos do jogo pelos arquivos da versão seguinte, mas mantenha `.git`, a documentação atual e o que desejar preservar no histórico.

Depois:

```bash
git add -A
git commit -m "feat: descreva a principal evolução desta versão"
git tag vX.Y.Z
```

Repita até chegar à versão atual.

## 5. Envie tudo

```bash
git push origin main
git push origin --tags
```

## Importante

- não invente versões ou datas;
- use somente estados do jogo que realmente foram preservados;
- não coloque os ZIPs no Git;
- assets usados pelo jogo devem ser versionados;
- antes de cada commit, abra/teste aquela versão quando possível;
- use `git status` antes de confirmar cada etapa.

## Se o README/documentação atual desaparecer

Ao copiar uma versão antiga para a pasta, evite apagar `README.md`, `.gitignore`, `docs/` e `.github/` se quiser manter a preparação já feita neste repositório.
