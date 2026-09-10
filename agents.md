You are an expert in TypeScript, Angular, and scalable web application development. You write functional, maintainable, performant, and accessible code following Angular and TypeScript best practices.

## Sobre o sistema

O sistema é usado em **portarias** para controlar a **entrada e saída de veículos** em
**várias filiais**. Cada filial (unidade administrativa) possui seus próprios pontos de
controle, câmeras e movimentações. Considere sempre o contexto multi-filial ao modelar
entidades, consultas e permissões — os dados devem ser escopados/contextualizados por
unidade administrativa (filial), não apenas globalmente.

## TypeScript Best Practices

- Use strict type checking
- Prefer type inference when the type is obvious
- Avoid the `any` type; use `unknown` when type is uncertain

## Angular Best Practices

- Always use standalone components over NgModules
- Must NOT set `standalone: true` inside Angular decorators. It's the default in Angular v20+.
- Do NOT set `changeDetection: ChangeDetectionStrategy.OnPush` explicitly. `OnPush` is the default in Angular v22+.
- Use signals for state management
- Implement lazy loading for feature routes
- Do NOT use the `@HostBinding` and `@HostListener` decorators. Put host bindings inside the `host` object of the `@Component` or `@Directive` decorator instead
- Use `NgOptimizedImage` for all static images.
  - `NgOptimizedImage` does not work for inline base64 images.

## Accessibility Requirements

- It MUST pass all AXE checks.
- It MUST follow all WCAG AA minimums, including focus management, color contrast, and ARIA attributes.

### Components

- Keep components small and focused on a single responsibility
- Use `input()` and `output()` functions instead of decorators
- Use `model()` for two-way bound properties with `[(prop)]` syntax instead of pairing `input()` with `output()`
- Use `computed()` for derived state
- Use `linkedSignal()` for state derived from multiple reactive sources that must stay synchronized
- Prefer inline templates for small components
- Prefer Signal Forms (`@angular/forms/signals`) for new forms. They are stable in Angular v22+ and provide signal-based state, type-safe field access, and schema-based validation
- When not using Signal Forms, prefer Reactive forms instead of Template-driven ones
- Do NOT use `ngClass`, use `class` bindings instead
- Do NOT use `ngStyle`, use `style` bindings instead
- When using external templates/styles, use paths relative to the component TS file.

## State Management

- Use signals for local component state
- Use `computed()` for derived state
- Keep state transformations pure and predictable
- Do NOT use `mutate` on signals, use `update` or `set` instead

## Templates

- Keep templates simple and avoid complex logic
- Use native control flow (`@if`, `@for`, `@switch`) instead of `*ngIf`, `*ngFor`, `*ngSwitch`
- Use the async pipe to handle observables
- Do not assume globals like (`new Date()`) are available.

## Services

- Design services around a single responsibility
- Use the `providedIn: 'root'` option for singleton services
- Prefer the `@Service` decorator over `@Injectable({providedIn: 'root'})` for new singleton services (Angular v22+)
- Use the `inject()` function instead of constructor injection

## API e ambiente backend

A aplicação consome uma API REST separada (back-end NestJS em
`controle-logistica-ts`). A URL base local é `http://localhost:3000` (porta
`3000`; **sem prefixo global** — os recursos ficam na raiz). Consulte o
Swagger antes de implementar/chamar um endpoint para conferir contratos,
parâmetros e schemas.

### Documentação (Swagger)

A documentação interativa da API é servida pelas rotas abaixo (públicas, sem
autenticação):

| Método | Rota          | Descrição                  |
| ------ | ------------- | -------------------------- |
| GET    | `/docs`       | Interface Swagger UI       |
| GET    | `/docs-json`  | Spec OpenAPI em JSON        |

URLs locais:
- Swagger UI: `http://localhost:3000/docs`
- Spec JSON: `http://localhost:3000/docs-json`

### Recursos (prefixos dos controllers)

| Recurso                  | Prefixo        | Descrição                                              |
| ------------------------ | -------------- | ------------------------------------------------------ |
| Autenticação             | `/auth`        | Autenticação e tokens JWT                              |
| Usuários                 | `/user`        | Gestão de usuários                                     |
| Empresas                 | `/company`     | Gestão de empresas                                     |
| Unidades administrativas | `/admin-unity` | Unidades administrativas                               |
| Veículos                 | `/vehicle`     | Veículos                                               |
| Câmeras                  | `/camera`      | Câmeras IP para reconhecimento de placas               |
| Movimentações            | `/movement`    | Entrada e saída de veículos                            |
| Pontos                   | `/point`       | Pontos de controle                                     |
| ANPR                     | `/anpr`        | Reconhecimento de placas (OCR delegado ao anpr-service) |

Para o front-end, centralize a URL base em `environment.ts` (ou equivalente) —
não hardcode `localhost:3000` em serviços.

## Zard-UI — Biblioteca de componentes

Este projeto inclui uma biblioteca interna de componentes no estilo shadcn/ui, inspirada no
[zard-ui](https://zardui.com) e portada do `consumo-real-web`. Os componentes ficam em
`src/app/shared/components/` e seguem estas convenções:

### Conceitos básicos

- **Seletores**: primitivas da biblioteca usam o prefixo `z-` (ex.: `<z-button>` na verdade é o
  atributo `z-button` aplicado a `<button>`/`<a>`). Wrappers de domínio usam o prefixo `gp-`
  (ex.: `<gp-avatar>`, `<gp-status-badge>`, `<gp-empty-state>`).
- **Path alias**: importe os componentes via `@/shared/components/...`. O alias `@/` mapeia para
  `src/app/`. Configurado em `tsconfig.json` (`paths`) e no `components.json` (zard-ui CLI).
- **Variantes (cva)**: cada componente visual expõe um `*.variants.ts` usando
  `class-variance-authority`. Os campos de variante viram inputs com prefixo `z` (ex. `zType`,
  `zSize`, `zShape`). Não escreva classes de cor/tamanho manualmente — passe a variante.
- **mergeClasses**: utilitário em `@/shared/utils/merge-classes` que combina `clsx` +
  `tailwind-merge`. Use-o para mesclar classes extras às classes geradas pelas variantes sem
  duplicar/utilidades conflitantes. Todo componente aceita um input `class` para override.
- **Ícones**: usamos `@ng-icons/lucide`. Registre os ícones necessários em `app.config.ts` via
  `provideIcons({ ... })` e use `<ng-icon name="lucideX" />` nos templates. Componentes que precisam
  de ícones próprios registram-nos localmente em `viewProviders: [provideIcons({ ... })]`.
- **Design tokens**: as cores/raios estão em `src/styles.css` (bloco `@theme inline` + `:root/.dark`).
  Use as utilidades Tailwind correspondentes: `bg-primary`, `text-muted-foreground`, `border-border`,
  `ring-ring`, `rounded-md`, etc. Há tema claro/escuro via classe `.dark` no `<html>`.
- **Camada SCSS**: `src/styles.scss` importa `src/styles/_variables|_theme|_typography.scss`
  (variáveis de layout, fontes Geist, color-scheme). Ambos listados em `angular.json`.

### Como usar (exemplos básicos)

Importe o componente standalone no `imports` do seu `@Component` e use no template:

```ts
import { ZardButtonComponent } from '@/shared/components/button/button.component';

@Component({
  imports: [ZardButtonComponent],
  template: `<button z-button zType="default" zSize="default">Salvar</button>`,
})
export class Demo {}
```

Botão — aplica-se a `<button>` ou `<a>`; variantes `zType`: `default | destructive | outline |
secondary | ghost | link`; `zSize`: `default | sm | lg | icon`; `[zLoading]`, `[zDisabled]`, `[zFull]`:

```html
<button z-button zType="destructive" [zLoading]="salvando()" (click)="salvar()">Excluir</button>
<a z-button zType="outline" zSize="sm" routerLink="/novo">Novo</a>
<button z-button zType="ghost" zSize="icon" aria-label="Ações"><ng-icon name="lucideMenu" /></button>
```

**Estilo do botão primary (`zType="default"`)** — implementado em
`src/app/shared/components/button/button.variants.ts`:

- **Fundo**: gradiente vertical `linear-gradient(to bottom, color-mix(in oklch, var(--primary), white 30%), var(--primary))` — o topo fica ligeiramente mais claro que a base (efeito "luz de topo"). O `bg-primary` é mantido como fallback para navegadores sem `color-mix`.
- **Sombra**: `shadow-primary-button` — anel violeta `#6c47ff` 1px + linha branca `rgba(255,255,255,0.14)` 1px no topo (inset) + sombra de profundidade. O utilitário inlina o valor (a variável `--shadow-primary-button` **não** é emitida no CSS final; não referencie `var(--shadow-primary-button)` em SCSS).
- **Hover**: `hover:brightness-95` em vez de `hover:bg-primary/90` — o gradiente é opaco e cobriria a cor de fundo, então o hover escurece tudo via `filter`. A transição inclui `filter`: `transition-[filter,background-color,box-shadow]`.
- **Raio**: `rounded-md` (6px, da base). **Texto**: branco (`text-primary-foreground`), `font-medium`.
- `tailwind-merge` mantém `bg-[linear-gradient(...)]` (grupo bg-image) junto com `bg-primary` (grupo bg-color) — não são tratados como conflitantes.

Badge — `<z-badge zType="..." zShape="...">`. `zType`: `default | secondary | destructive | outline`;
`zShape`: `default | square | pill`:

```html
<z-badge zType="secondary" zShape="pill">Pendente</z-badge>
```

Input — diretiva `z-input` em `<input>`, `<textarea>` ou `<select>`. Combina com `formControlName`.
Inputs: `zSize`, `zStatus` (`error | warning | success`), `[zBorderless]`, `[zNumeric]` + `zStep/zMin/zMax`,
`[zPass]` (senha com toggle), `[zMaxlength]`/`[zMinlength]`:

```html
<input z-input formControlName="email" placeholder="seu@email.com" />
<input z-input [zNumeric]="true" [zMin]="0" [zMax]="100" [zStep]="5" />
<input z-input [zPass]="true" [zMinlength]="6" placeholder="••••••" />
<textarea z-input rows="4" formControlName="obs"></textarea>
```

Card — `ZardCardComponent` (`z-card`) com sub-blocos projetáveis (header/content/footer via `ng-content`
/seletores de partes). Use para agrupar conteúdo em superfícies.

Dialog — serviço `ZardDialogService` (`@/shared/components/dialog/dialog.service`). Abra com
`create({ zContent, zData, zViewContainerRef })` e receba um `ZardDialogRef`. Injete
`Z_MODAL_DATA` no componente de conteúdo para receber os dados. Feche com `dialogRef.close(result)`
e assine `dialogRef.onClose()`:

```ts
private readonly dialog = inject(ZardDialogService);
private readonly vcr = inject(ViewContainerRef);

abrir(): void {
  const ref = this.dialog.create<MeuComp, MeuResult>({
    zContent: MeuComp,
    zData: { id: 42 },
    zViewContainerRef: this.vcr,
  });
  ref.onClose().subscribe((r) => r && this.aposSalvar(r));
}
```

Toast — renderize `<z-toaster />` uma única vez (fora do router, no `App`). Dispare toasts pela
função `toast` do `ngx-sonner`:

```ts
import { toast } from 'ngx-sonner';
toast.success('Salvo com sucesso.');
toast.error('Falha ao salvar.');
```

Ícones — registre em `app.config.ts` e use `<ng-icon name="lucide<NomePascal>" />`
(ex.: `lucidePlus`, `lucideSearch`, `lucideTrash2`). Sem registro, o ícone não renderiza.

### Boas práticas ao usar/criar componentes Zard

- Prefira variante (`zType`, `zSize`, ...) a classes de cor/tamanho manuais.
- Para ajustes pontuais, passe `[class]="..."` (mesclado via `mergeClasses`) — nunca sobrescreva as classes da variante.
- Mantenha cada componente com `index.ts` (barrel) reexportando o componente e variantes.
- Novos componentes zard-ui primitivos devem usar prefixo `z-` e ficar em pasta própria sob
  `shared/components/<nome>/` com `<nome>.component.ts`, `<nome>.variants.ts` e `index.ts`.
- Wrappers de domínio do app devem ganhar prefixo próprio (ex.: `gp-`) e reaproveitar primitivas `z-`.
- Reutilize `@/shared/utils/merge-classes` e `@/shared/core/directives/string-template-outlet` quando aplicável.

## Tema claro/escuro e sistema de cores

O sistema de cores segue o padrão shadcn/ui adaptado para Tailwind v4. Há **uma única fonte
de verdade** para as cores; nunca invente tokens duplicados.

### Onde as cores vivem

- **`src/styles.css`** — define os design tokens em `:root` (tema claro) e `.dark` (tema escuro),
  ambos com **os mesmos nomes** (`--background`, `--foreground`, `--primary`, `--muted-foreground`,
  `--border`, `--ring`, `--destructive`, `--warning`, `--success`, `--info`, `--chart-*`,
  `--sidebar-*`, etc.). O bloco `@theme inline` mapeia cada `--xxx` para `--color-xxx`, que é o
  namespace que o Tailwind expõe como utilidades.
- **`src/styles/_variables.scss`** — apenas variáveis de **layout** (sidebar, header), sombras e
  transições, mais os tints derivados `--primary-light`/`--primary-dark`. NÃO redeclare cores aqui.
- **`src/styles/_theme.scss`** — `color-scheme` por tema para controles nativos.
- **`src/styles/_typography.scss`** — fontes Geist + escala tipográfica.

### Como o tema é aplicado

O tema escuro é ativado adicionando a classe `.dark` ao elemento `<html>`. O `@custom-variant dark`
no `styles.css` faz `dark:` do Tailwind responder a essa classe. A troca é gerenciada pelo
`ThemeService` (`@/shared/services/theme.service`), signal-based, com persistência em `localStorage`
e fallback para `prefers-color-scheme`.

```ts
import { inject } from '@angular/core';
import { ThemeService } from '@/shared/services/theme.service';

private readonly themeService = inject(ThemeService);

alternarTema(): void { this.themeService.toggle(); }
get isDark() { return this.themeService.isDark; } // signal<boolean>
```

Em templates: `<button z-button zType="ghost" (click)="temaSvc.toggle()" [attr.aria-pressed]="temaSvc.isDark()">...</button>`.

### Regras para usar cores

- **Cor primária com parcimônia**: a cor primária é reservada para ações de grande destaque — o
  CTA principal de uma tela ou a única ação de destaque em um estado vazio. Botões de ação
  secundária (ex.: "Nova empresa"), controles de paginação e elementos utilitários devem usar
  variantes neutras (`secondary`, `outline`, `ghost`).
- **Em templates HTML**: use SEMPRE as utilidades do Tailwind — `bg-primary`, `text-muted-foreground`,
  `border-border`, `ring-ring`, `bg-destructive/10`, `text-warning-foreground`, etc. Isso garante
  tema claro/escuro automático e opacidade via modificador (`/90`).
- **Em SCSS de componentes**: referencie os tokens canônicos diretamente (`var(--primary)`,
  `var(--muted-foreground)`, `var(--border)`), nunca aliases inventados. Evite o prefixo
  `--color-*` em SCSS — ele pertence ao namespace Tailwind e pode não existir em runtime (o
  `@theme inline` o descarta quando nenhuma utilidade o exige).
- **NÃO** criar aliases redundantes (`--bg-card`, `--text-primary`, `--border-color`, ...). Se
  precisa de uma cor, use o token existente. Esses aliases causam descompasso e bugs.
- **Tints/tons**: para variações sutis do primary use `var(--primary-light)` / `var(--primary-dark)`
  (já declarados via `color-mix`) ou compose `color-mix(in oklch, var(--primary), transparent 90%)`
  inline. Não introduza novas cores fixas.
- **Estados semânticos** já têm tokens: `--destructive` (erro/excluir), `--warning` (atenção),
  `--success` (sucesso), `--info` (informativo). Use-os em vez de hex/rgb arbitrários.
- **Cores de gráfico**: `--chart-1` a `--chart-5` — palette consistente para gráficos.
- **Acessibilidade**: as cores escolhidas já atendem contraste WCAG AA nos pares
  foreground-background. Ao combinar cores customizadas, valide o contraste.

## Git e commits

Faça commits **pequenos, frequentes e atomicamente lógicos** — cada commit deve representar
uma única preocupação e deixar a árvore compilável.

### Princípios

- **Um commit = uma mudança lógica.** Não misture configuração de build, nova feature e
  refatoração no mesmo commit. Separe por responsabilidade, não por arquivo.
- **A árvore deve compilar após cada commit.** Se uma mudança depende de outra, commits
  dependentes em sequência são aceitáveis, mas cada um deve ser coerente isoladamente.
- **Commits pequenos facilitam review, `git bisect` e `revert`.** Prefira 5 commits focados
  a 1 commit gigante.
- **Nunca commitem secrets/chaves**. Antes de commitar, rode `git status`/`git diff` e
  confirme que apenas os arquivos pretendidos estão staged.

### Ordem típica ao iniciar uma tarefa grande

1. Configuração de build/dependências (package.json, tsconfig, angular.json)
2. Estilos/design system (styles.css, SCSS parcial, tokens)
3. Componentes/utilitários compartilhados (shared/)
4. Serviços/core
5. Features/components de tela
6. Documentação (agents.md, README)

### Mensagens de commit

- Escreva no **imperativo** ("Adiciona", "Corrige", "Remove"), em português, concisa.
- Use o **corpo** para explicar o **porquê** (não o quê — o diff já mostra o quê).
- Quando a mudança vem de outro projeto (ex.: portada de `consumo-real-web`), mencione a origem.

### Fluxo contínuo

Mantenha commits contínuos enquanto trabalha: ao concluir uma unidade lógica, commite antes
de iniciar a próxima. Não acumule um dia inteiro de mudanças para commitar no fim — isso
gera commits irrevisíveis e historia ruidosa. Acostume-se a commitar a cada poucos arquivos
coerentes, mantendo o histórico legível e rastreável.
