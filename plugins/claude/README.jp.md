# claude-code-for-codex

[English](README.md) | 日本語

CodexからローカルのClaude Code CLIにレビューや調査を依頼するプラグインです。[openai/codex-plugin-cc](https://github.com/openai/codex-plugin-cc)の逆方向の連携として、独立した実装を提供します。

プラグイン名は`claude`、コマンドの接頭辞は`/claude:`です。

| コマンド | 用途 |
| --- | --- |
| `/claude:setup` | Claude Codeの導入・認証状態の確認 |
| `/claude:test --model モデル名` | 指定モデルへの短い接続テスト（実際の利用枠を消費） |
| `/claude:review` | 作業中の変更や指定ブランチとの差分レビュー |
| `/claude:adversarial-review` | 設計上の前提、失敗条件、見落としの検討 |
| `/claude:rescue` | 問題の調査、または許可された修正の委譲 |
| `/claude:transfer` | 現在のタスクを要約してClaudeへ引き継ぐ |
| `/claude:status` | ジョブの状態・一覧の確認 |
| `/claude:result` | 保存済みの結果の取得 |
| `/claude:cancel` | 指定したジョブの停止 |

`/claude:review`などはスキルの呼び出し表記と同梱CLIのコマンド別名です。Codexのネイティブなスラッシュメニューへの表示・登録はホスト側の仕様に依存します。プラグインだけでClaude Codeと同じコマンドメニューを保証するものではありません。メニューに出ない環境でも、利用可能な`claude`のスキルを選ぶか「Claudeでこの変更をレビューして」と依頼できます。

## GitHubからインストール

プラグイン対応のCodex CLIで実行してください。

```sh
codex plugin marketplace add https://github.com/Himare4092/claude-code-for-codex
codex plugin add claude@claude-code-for-codex
```

インストール後は新しいCodexタスクで `/claude:setup` を実行してください。
`/claude:test --model sonnet` は実際のモデル呼び出しを行い、利用枠を消費します。
配布バンドルには依存ライブラリが含まれるため、利用者による `npm install` は不要です。

## 必要なもの

- Node.js 22以上とGit
- `--restricted`対応のClaude Code CLI（このPCの2.1.251で検証）
- Claude Codeの認証済みアカウント、または利用可能なAPI設定
- プラグイン、スキル、MCPサーバーに対応するCodex環境

Claude Codeの導入とログインは[公式セットアップ手順](https://code.claude.com/docs/en/setup)に従ってください。まず端末で`claude --version`を確認し、通常のClaude Codeを起動して必要なログインを済ませます。プラグインのsetupは状態を確認し、ログイン情報の書き換えは行いません。

Claudeの実行はローカルのClaude Codeの認証・利用枠に従います。Codexの利用枠とは別です。課金方式をプラグインが切り替えることはありません。子プロセスは`--restricted`で起動するため、ユーザー・プロジェクト・ローカルのsettingsファイルは読み込みません。モデルを指定しなければ、この制限モードでのClaude既定値を使用します。通常のsettingsに設定したモデルを使う場合は`--model`で指定してください。settingsのapiKeyHelperだけに依存する認証も自動継承されません。

## ビルドと開発

リポジトリのルートで実行します。

```powershell
npm ci
npm run build
npm test
npm run setup
```

配布用プラグインのルートは`plugins/claude`です。ソース変更後は`npm run build`を実行してください。Codexにキャッシュされたプラグインの更新方法は、利用しているCodexのプラグイン管理機能に従います。

## Codexでの使用例

GitHubからのインストール後、新しいCodexタスクで以下のコマンドを利用できます。

```text
/claude:review
/claude:review --base main
/claude:adversarial-review 認証処理の失敗条件を重点的に確認して
/claude:rescue このエラーの原因を調べて。まだ編集しないで
/claude:rescue 再現している不具合を修正して
/claude:transfer 現在の調査内容を要約してClaudeに続きを検討させて
/claude:status
/claude:result ジョブID
/claude:cancel ジョブID
```

レビュー・調査・引き継ぎはバックグラウンドで開始し、ジョブIDを返します。開始時点の応答はレビュー結果ではありません。Codexは`status`で進捗を確認し、`result`で結果を取得します。複数のジョブがある場合、停止する対象のIDを指定してください。

通常のレビューはステージ済み差分（HEAD→index）と未ステージ差分（index→作業ツリー）を個別に渡し、未追跡のテキストファイルも対象にします。`base`指定時は、その参照とのmerge baseから作業ツリーへの差分を比較します。最初のコミットが存在するGitリポジトリが必要です。バイナリや通常ファイルではない項目は省略を明記し、入力が1 MiBを超えた場合は切り捨てずエラーにします。

`rescue`は既定で読み取り専用です。Codexが利用者の修正依頼を受けて`write:true`を渡した場合に編集用ツールを有効にします。Claudeの変更はCodexが差分を確認し、必要なテストを行います。`transfer`は要約を渡した新しい読み取り専用ジョブであり、Codexの会話履歴そのもののインポートやタスク移動ではありません。

結果の`sessionId`を使い、端末で`claude --resume SESSION_ID`を実行するとClaude Code側で続きを行えます。

## 同梱CLI

### モデルの指定

実行系の5コマンド（test、review、adversarial-review、rescue、transfer）は`--model`に対応しています。以下のように空白を含む名前も指定できます。

```text
/claude:review --model Opus 5
/claude:review --model Fable5
/claude:review --model Fable 5.1
/claude:review --model Fable 5 -yes
/claude:review --model Fable 5.1 -y
```

`Opus 5`→`claude-opus-5`、`Fable5`／`Fable 5`→`claude-fable-5`、`Fable 5.1`→`claude-fable-5-1`へ変換します。大文字・小文字は区別せず、公式モデルIDも直接指定できます。モデルを指定しない場合の動作は従来どおりです。[公式モデル設定](https://support.claude.com/en/articles/11940350-claude-code-model-configuration)

Fable指定時は、Claude Max等の対象プランまたは利用クレジットが必要なことを事前に警告し、了承まで起動しません。公式案内ではMax等の対象プランに含まれ、Pro等では利用クレジットを消費します。API利用は従量課金です。[公式の利用条件](https://support.claude.com/en/articles/15424964-claude-fable-models-on-your-plan)

`-y`と`-yes`はどちらも、その1回のFable利用について了承済みとする指定です。事前警告をスキップしますが、編集権限などは追加しません。通常の端末では警告後に`y`／`yes`／`はい`で了承できます。非対話実行では、未了承なら`confirmation_required`と警告を返し、終了コード2で停止します。Codexはこの応答を表示して了承を待ち、了承後に同じ依頼を再送します。

setup、status、result、cancelはモデルを実行しないため`--model`の対象外です。Fableの動作確認では実モデルを呼ばず、代替のテスト用プロセスで指定IDと了承条件を検証しています。

CodexのMCPツールを経由せず、同じ実行管理を端末から利用できます。以下はリポジトリルートで実行する例です。`D:/project`は実際の対象リポジトリの絶対パスに置き換えます。

```powershell
node plugins/claude/dist/cli.mjs /claude:setup
node plugins/claude/dist/cli.mjs /claude:review --repo "D:/project" --background
node plugins/claude/dist/cli.mjs /claude:review --repo "D:/project" --base main --wait
node plugins/claude/dist/cli.mjs /claude:adversarial-review --repo "D:/project" --prompt-file "D:/focus.txt" --background
node plugins/claude/dist/cli.mjs /claude:rescue --repo "D:/project" --prompt-file "D:/task.txt" --background
node plugins/claude/dist/cli.mjs /claude:rescue --repo "D:/project" --prompt-file "D:/task.txt" --write --background
node plugins/claude/dist/cli.mjs /claude:transfer --repo "D:/project" --prompt-file "D:/handoff.txt" --background
node plugins/claude/dist/cli.mjs /claude:status --repo "D:/project"
node plugins/claude/dist/cli.mjs /claude:result JOB_ID --repo "D:/project"
node plugins/claude/dist/cli.mjs /claude:cancel JOB_ID --repo "D:/project"
```

`--wait`は完了まで待機します。複数行の依頼はUTF-8のテキストファイルと`--prompt-file`を使うと、シェルの引用符や改行による誤解釈を避けられます。通常の文章引数による依頼も利用できます。

## MCPインターフェース

| ツール | 主な入力 |
| --- | --- |
| `claude_setup` | `{}` |
| `claude_review` | `repo`、任意の`base` |
| `claude_adversarial_review` | `repo`、任意の`base`・重点事項の`prompt` |
| `claude_rescue` | `repo`、`prompt`、任意の`write`・`resume` |
| `claude_transfer` | `repo`、要約を入れる`prompt` |
| `claude_status` | `repo`、任意の`id` |
| `claude_result` | `repo`、`id` |
| `claude_cancel` | `repo`、`id` |

`repo`は絶対パスです。開始系ツールは`id`、`state`、`repo`を返します。`model`と`effort`は任意で、未指定なら既定値を保ちます。`effort`は`low`、`medium`、`high`、`xhigh`、`max`を受け付け、実際のモデル・CLIの対応範囲に従います。`timeoutSeconds`の既定値は600秒、上限は3600秒です。`resume`はClaudeのセッションUUIDであり、プラグインのジョブIDとは異なります。

Fableで未了承の場合は例外として、ジョブIDを発行せず`state:"confirmation_required"`、`model`、`warning`を返します。明示的な了承、または利用者が入力した`-y`／`-yes`がある場合だけ`confirmFable:true`を送信します。一般的な作業許可やプロンプト本文からこの値を自動生成しないでください。

## 実行範囲と制約

- 読み取り専用ジョブのClaudeツールはRead、Glob、Grepです。修正を許可したrescueではEdit、Writeを追加します。Claudeにはシェルを渡さず、テストなどのコマンド実行はCodexが担当します。
- ツール制限はOSの隔離環境ではありません。扱うリポジトリは信頼できるものを使用し、並行編集する場合は別のworktreeなどで作業場所を分けてください。
- `--restricted`でファイル操作を作業ディレクトリに制限します。追加のMCPサーバーとhooksを無効化し、ClaudeからCodexへ再委譲する経路を作りません。管理者のポリシー設定は引き続き適用されます。
- 同一リポジトリでこのプラグインが実行できるジョブは1件です。異常終了で`interrupted`になった場合は、古いworkerとClaudeが終了したことを確認してから、エラーに表示された`active.lock`のみを削除してください。自動的にロックを解除して別の編集を開始することはありません。
- Claudeへの入力には差分、依頼文、必要に応じて参照したコードが含まれます。Claude Codeのサービスへ送信できる内容だけを対象にしてください。
- ジョブと出力はローカルの`~/.claude-plugin-cc/jobs`に保存されます。Windowsでは通常`C:/Users/ユーザー名/.claude-plugin-cc/jobs`です。結果にコードや依頼文が含まれる場合があります。
- キャンセルは既に行った編集を元に戻しません。途中の差分も利用者の変更と同様に確認してください。
- レビュー指摘はCodexが根拠を確認して扱います。自動のレビュー・修正反復、第三者へのメッセージ送信、権限バイパスは行いません。
- 認証切れ、CLIの未導入、対応外のモデルやオプション、タイムアウトは実行失敗として確認してください。結果の取得だけで新たなClaudeジョブを起動することはありません。

本プロジェクトはOpenAIおよびAnthropicの公式プラグインではありません。

## 検証

`npm run check`はビルドと自動テストを実行します。Claudeの実リクエストは通常のテストには含まれません。実機確認を行う場合は`node scripts/smoke-real.mjs`を実行してください。小さな合成リポジトリだけをレビューし、Claudeの利用枠を消費します。確認結果はGit対象外の`.claude-plugin-cc/smoke-result.json`に保存されます。
