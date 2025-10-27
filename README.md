# CapyFlow

Uma aplicação web abrangente de chat com IA que integra visão computacional, geração de imagens, criação de código e otimização de prompts, utilizando as APIs do Gemini e OpenAI de forma segura e modular.

## Funcionalidades

### Chat Interativo
Interface de chat amigável para interação com modelos de IA (Gemini 2.0 Flash e GPT-4o Mini).


### CapyIMG (Geração de Imagens)
Geração de imagens a partir de prompts textuais com controle granular sobre:
- **Estilos:** Cinematic, Neon, Cyberpunk, 3D Cartoon, Realista, Flat Vector
- **Proporções:** 1:1, 16:9, 9:16
- **Modelos:** Pollinations (não é necessária nenhuma chave de API)

### CapyIMGtxt (Visão Computacional)
Análise de imagens enviadas pelo usuário e geração automática de prompts descritivos utilizando:
- Gemini 2.0 Flash (prioridade)
- OpenAI GPT-4o-mini (fallback automático)

### CapyIDE (Geração de Código)
Criação de código HTML/CSS/JS completo e funcional a partir de descrições textuais:
- Editor Monaco integrado
- Pré-visualização em tempo real
- Download direto dos arquivos

### CapyPrompt (Refino de Prompts)
Análise e melhoria automática de prompts focando em:
- Clareza e especificidade
- Sugestões de estrutura
- Otimização para o modelo alvo

### Histórico Local
- Salvamento automático de múltiplas conversas
- Timestamps e busca
- Carregamento de conversas anteriores

## Arquitetura

### Frontend
- HTML/CSS/JavaScript puro
- Editor Monaco para edição de código
- Design responsivo e moderno
- Armazenamento local com localStorage

