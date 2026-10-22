# いさむボーイ公式サイト　Phase 2・Phase 3 実装手順書

**対象：実装を委託される開発担当者**  
**作成日：2026年10月19日**  
**対象範囲：既存デモのデータ分離／Pages CMSでの編集画面構築・検証**  
**対象外：ご本人のアカウント作成、GitHub Organizationの本番構築、Cloudflare Pages本番公開、独自ドメイン設定**

> この文書は開発依頼用の仕様書兼作業手順書です。付属の `.pages.yml` とJSONは初期設定例であり、サイトの完成コードではありません。実装担当者は、既存HTMLを改修してデータ読み込みと画面表示を作成してください。

## 0. 概要・目的

大道芸人「いさむボーイ」の公式サイトを、ITに詳しくない本人が**主にスマートフォンから**更新できるようにする。更新対象は**出演予定、基本情報、キャッチコピー、紹介文、プロフィール、経歴、出演実績、パフォーマンス内容、写真、問い合わせ先**とする。本人はHTML・JSON・GitHubのコード画面を触らない。

将来の目標構成：**Pages CMS（編集）→ GitHub（ファイル管理）→ Cloudflare Pages（公開）**。今回は先にPhase 2とPhase 3の開発・仮環境での検証を行い、ご本人が必要な本番所有者設定を後回しにする。

**既存デモ**：<https://github.com/kei487/kei487.github.io/blob/main/demo/index.html>  
デモの掲載項目：トップ／次の出演／出演スケジュール／パフォーマンス内容／プロフィール／経歴／出演実績／問い合わせ。既存デザインのトーンとモバイル表示をできる限り維持する。デモ冒頭の「GitHub上でHTMLを編集する」案内はCMS導入後に不要になるため、削除する。

### 判断済みの設計方針

- **バニラHTML・CSS・JavaScript**を基本とする。今回の規模では大規模フレームワークやデータベースを増やさない。
- データはJSONへ分離し、ブラウザから `fetch()` で読み込む。Cloudflare Pagesでの追加ビルド工程を原則不要にする。
- 出演予定は `data/events.json` の**1ファイル内の配列**で扱う。1件1ファイル方式にすると、静的サイト側でファイル一覧を取得するために追加のビルド工程が必要になるため、今回は採用しない。
- 画像は `images/` に保管し、CMSの画像アップロード機能で差し替えられるようにする。
- 本番移行時にリポジトリ所有者・ドメインが変わっても動くように、固有のGitHubユーザー名・リポジトリ名・ドメインをHTML/JSに埋め込まない。

## 1. 役割分担と前提

| 担当 | 今回の作業 |
| --- | --- |
| 依頼主 | 現行デモと資料の提供、仮リポジトリの用意または権限付与、完成確認 |
| 開発担当者 | Phase 2・Phase 3の実装、Pages CMSの動作検証、コードと説明資料の納品 |
| 大道芸人ご本人 | **今回の作業には参加不要**。本番移行時のアカウント作成と内容確認を予定 |

依頼主・開発担当者の作業用GitHubリポジトリ（例：`isamu-website-staging`）を使用する。**元の `kei487.github.io` の `main` や他のページを不用意に変更しないこと。** 開発担当者は作業ブランチで実装し、レビュー用Pull Request（PR）または成果物を渡す。

初期状態がデモ1ファイルでも構わない。作業用リポジトリでは、`demo/index.html` の内容をサイトのルート `index.html` に配置して開発する。

## 2. 目標ディレクトリ構成

```text
isamu-website-staging/       ← GitHubリポジトリのルート
├── .pages.yml               ← Pages CMS設定
├── index.html               ← 画面の骨組み
├── css/
│   └── style.css            ← 既存デザインを移動・整理
├── js/
│   └── site.js              ← JSON読み込み・表示処理
├── data/
│   ├── site.json            ← 基本情報・プロフィール・連絡先
│   ├── events.json          ← 出演スケジュール
│   ├── performances.json    ← パフォーマンス内容
│   ├── history.json         ← 経歴
│   ├── achievements.json    ← 出演実績
│   └── gallery.json         ← 写真ギャラリー
├── images/                  ← Pages CMSでアップロードする画像
├── README.md                ← 開発・移行・編集方法
└── .gitignore
```

**重要：** `.pages.yml` は必ず**リポジトリのルート**に置く。パスは上記構成を前提とし、将来Cloudflare Pagesでもサイトのルート（`/`）として公開する。画像URLとしてCMSが記録する `/images/...` は、ドメイン直下での公開を想定している。サブディレクトリ公開を採用した場合はパス設計を再確認する。

## 3. Phase 2：既存HTMLのCMS対応

### Step 2-1. 既存デモの複製・分離

1. 作業用リポジトリと作業ブランチを準備する。
2. 既存 `demo/index.html` をコピーして、作業用リポジトリの `index.html` とする。
3. `<style>` にある既存CSSを `css/style.css` に分離する（必須ではないが推奨）。
4. HTMLに直書きされている編集対象の文章・予定・出演実績などをJSONへ移す。
5. ページの見出し・ナビゲーション・セクション順序・配色などは、原則として既存デモから大きく変えない。
6. デモ内の説明用コメントや、過去日付のデモ出演情報が本番情報のように表示されないよう整理する。

### Step 2-2. 編集可能なデータの定義

**`data/site.json`**（単一オブジェクト）：`stage_name`、`tagline`、`catchphrase`、`introduction`、`genre`、`area`、`duration`、`biography`、`hero_image`、`profile_image`、`contact_message`、`contact_email`、`instagram_url`、`inquiry_url`。

**`data/events.json`**（配列）：各予定に `date`（`YYYY-MM-DD`）、`time`（複数回の出演も書ける自由入力）、`place`、`title`、`note`、`event_url`（任意）、`status`（`scheduled` / `canceled`）、`published`（真偽値）を設ける。

**`data/performances.json`**（配列）：`title`、`description`、`image`。

**`data/history.json`**（配列）：`period`、`description`。

**`data/achievements.json`**（配列）：`description`。

**`data/gallery.json`**（配列）：`image`、`caption`、`alt_text`（代替テキスト）。

サンプルJSONは付属の `sample-config/data/` を参照。全ての仮文言・仮予定は**本番公開前にご本人確認後、削除・差し替え**すること。

### Step 2-3. HTMLからのデータ表示

1. `index.html` 内の動的箇所に、更新先を識別できる要素（例：`id="event-list"`、`id="next-event"`）を設ける。
2. `js/site.js` から各JSONを `fetch('./data/events.json')` のように**サイト相対パス**で読み込む。
3. 取得に失敗した場合は、無表示にせず「情報を読み込めませんでした」などの案内を表示する。失敗はコンソールでも確認できるようにする。
4. ユーザー入力に由来する文字列は、原則 `textContent` とDOM APIで描画する。`innerHTML` にJSONの文字列を直接連結しない。
5. 画像URLや外部リンクURLの値はチェックし、不正なスキーム（例：`javascript:`）をリンクとして使わない。
6. 未入力フィールド・空配列・画像未登録の場合でもページが崩れないようにする。
7. 画像には代替テキストを設定し、スマートフォンの画面幅でも読みやすくする。

### Step 2-4. 出演スケジュールの自動処理

**必須挙動：**

- `published: false` の予定をサイトに出さない。
- 予定を `date` の昇順に表示する。同日の複数予定は入力順を維持してよい。
- **日本時間（Asia/Tokyo）の「今日」**を基準とし、基本表示は今日以降の予定とする。日付だけで比較するため、当日の予定は終演後でも当日中は残ってよい。
- `status: canceled` の予定はスケジュールに「中止」と明記し、**「次の出演」の候補からは除外**する。
- `status: scheduled` かつ `published: true` の最も近い予定を「次の出演」に自動表示する。
- 今後の予定が0件なら「現在、公開中の出演予定はありません」と表示する。「次の出演」も同等のメッセージとし、古い情報を残さない。
- 予定内容を1回更新するだけで、「次の出演」と「出演スケジュール」の両方へ反映されるようにする（二重入力をなくす）。

**日付処理の注意点：** `new Date('YYYY-MM-DD')` に依存せず、年月日文字列と東京での現在日付を比較する。日本時間で日付が変わる境界（23:59／00:00）もテストする。

**表示例（JSONの1件）：**

```json
{
  "date": "2026-11-15",
  "time": "13:00〜13:30 / 16:00〜16:30",
  "place": "サンプル会場A",
  "title": "出演予定サンプル",
  "note": "雨天中止の可能性があります",
  "event_url": "",
  "status": "scheduled",
  "published": true
}
```

### Step 2-5. モバイル表示と公開前安全対策

- 横幅360〜390px程度でも、表やカードが横にはみ出さず、文字・画像・操作部分が見やすいこと。
- スケジュールは必要ならモバイル時にカード表示へ変更してよいが、デモの雰囲気は維持すること。
- 画像を貼り付けるだけで表示できるよう、`width: 100%`、`height: auto`、必要に応じて `object-fit` を使う。
- お問い合わせ先のメールアドレスを表示する場合は `mailto:` リンクにする。未設定ならリンクを生成しない。
- 本人未承認の個人情報、連絡先、写真を公開しない。仮データの表示にはテスト用である旨を明確にする。
- CMSやGitHubのアクセストークン、秘密鍵などをHTML／JS／JSON／リポジトリに埋め込まない。

## 4. Phase 3：Pages CMS導入

### Step 3-1. 設定ファイルの作成

1. リポジトリのルートに `.pages.yml` を作成する。
2. 付属の `sample-config/.pages.yml` を初期案として利用してよい。
3. 画像保存先を `images/`、画像URLを `/images` に設定する。
4. `site.json` は1件の固定ファイルとして編集できるようにする。
5. `events.json` などの配列は `type: file`、`format: json`、**`list: true`** にする。これによりトップレベル配列をフォーム上で扱う。
6. 日付はカレンダー入力（`type: date`）、開催状況は選択（`type: select`）、公開可否は切り替え（`type: boolean`）、写真は画像入力（`type: image`）にする。
7. 元のファイル自体を誤って消さないよう、固定ファイルには `operations.delete: false` を設定する。配列内部の予定は追加・削除できる状態を保つ。
8. 編集項目名・補足説明は**日本語**にし、スマートフォンで迷いにくい順番で配置する。

**設定の核となる例（完全版は付属設定ファイル参照）：**

```yaml
media:
  input: images
  output: /images
  rename: safe

content:
  - name: events
    label: 出演スケジュール
    type: file
    path: data/events.json
    format: json
    list: true
    operations:
      delete: false
    fields:
      - name: date
        label: 出演日
        type: date
        required: true
        options:
          format: yyyy-MM-dd
      - name: title
        label: イベント名
        type: string
        required: true
```

設定例はフィールドの一部のみ。`date` 以外も `events.json` と同じフィールド名で定義すること。なお、Pages CMSは**`.pages.yml` に定義していない項目を保存時に削除することがある**ため、JSONとCMSの項目名を必ず一致させる。

### Step 3-2. 開発用リポジトリでの接続テスト

1. 開発担当者または依頼主のGitHubアカウントで <https://app.pagescms.org/> にアクセスする。
2. GitHubでサインインし、Pages CMSのGitHub Appを**開発用リポジトリにのみ**許可する（可能な場合、全リポジトリへのアクセスは与えない）。
3. 対象リポジトリと作業ブランチを選び、`.pages.yml` が認識されることを確認する。
4. 管理画面で「基本情報」「出演スケジュール」「パフォーマンス内容」「経歴」「出演実績」「写真ギャラリー」が編集できることを確認する。
5. CMSからテストデータを保存し、**GitHubにJSONの更新コミットが作成されること**を確認する。
6. CMSから画像をアップロードし、`images/` に画像が追加され、対象JSONに公開用パスが保存されることを確認する。
7. テスト値を元に戻す。不要な画像も消す。

Pages CMSは、保存時にGitHubリポジトリ上のファイルを直接更新する。実際のサイト表示はPhase 2で実装したHTML/JSが担当する。開発環境で本番サイトへの自動反映を行わないよう、接続先・ブランチを必ず確認する。

**注意：** 友人へのCMS招待、友人アカウントでのログイン、本番OrganizationへのGitHub App再接続は、友人が参加する後続フェーズで実施する。**今回のPhase 3で完成するのは開発用リポジトリでのCMS動作確認まで**とする。

### Step 3-3. スマートフォン確認

実機（可能ならiPhone／Android）で、最低限以下を確認する。

- CMSの画面から出演予定を1件**追加・編集・削除**できる。
- 既存予定の開催状況を「中止」に変えられる。
- プロフィールの1項目を修正できる。
- 画像をスマートフォンからアップロードできる。
- 管理画面のボタンや入力欄が小さすぎず、入力・保存が可能。
- 編集結果がGitHubのJSON／画像に反映され、プレビューサイトの表示も更新される。

スマートフォンでのCMS操作は実機動作確認が必要。**ブラウザ上でフォームが表示されたことだけで完了にしない**。

## 5. ローカル動作確認

開発用リポジトリのルートで、以下を実行する。

```bash
python3 -m http.server 8000
```

その後、`http://localhost:8000/` にアクセスする。**`index.html` を `file://` で直接開かないこと。** ブラウザのセキュリティ制約で `fetch()` によるJSON取得が失敗する場合がある。

ローカル確認後、JSON編集→ページ再読み込みで表示が変わることを確認する。Pages CMSを使ったテストでは、CMS保存→GitHub反映後、開発用リポジトリを `git pull` して同様に確認できる。

## 6. 受け入れテスト（完了条件）

| No. | ケース | 期待結果 |
| --- | --- | --- |
| T01 | `site.json`の芸名・紹介文を変更 | ページの該当部分に反映される |
| T02 | `events.json`に未来の予定を追加 | 日付順で予定一覧に表示される |
| T03 | 最も近い予定を変更 | 「次の出演」も自動更新される |
| T04 | 過去の予定を登録 | 当日以降の予定一覧には表示されない |
| T05 | `status: canceled` に変更 | 一覧では「中止」と表示され、次回候補から除外される |
| T06 | `published: false` に変更 | サイトに表示されない |
| T07 | 今後の公開予定が0件 | 空状態のメッセージが表示される |
| T08 | 写真をCMSからアップロード・変更 | サイトに画像が表示され、リンク切れがない |
| T09 | 文章に `<` や `&` を入力 | 文字として表示され、HTMLとして実行されない |
| T10 | JSONファイルの取得に失敗 | エラー案内が出て、ページ全体が崩れない |
| T11 | スマートフォン（約375px幅）で閲覧 | 横スクロールを強制されず読める |
| T12 | スマートフォンでCMSから編集・保存 | GitHub上のファイルに反映される |
| T13 | 空の画像項目・任意項目 | 画像破損や空リンクが出ない |
| T14 | リポジトリを別名・別オーナーへ複製 | コード内に個人GitHub URL等の固定依存がなく、ローカル起動できる |

T02〜T07では**日本時間**の日付境界を意識して確認する。`T12` の実機テストができない場合、未実施である旨・理由・再確認担当を引き継ぎ資料に残す。

## 7. 納品物

- [ ] 実装済みのサイト一式（`index.html`、CSS、JavaScript、JSON、画像ディレクトリ）。
- [ ] `.pages.yml`（Pages CMSで読み込めることを検証済み）。
- [ ] 開発用リポジトリ上の作業ブランチ／Pull Request。主な変更点を説明する。
- [ ] `README.md`（ローカル起動方法、ファイルの役割、CMSで何を編集するか、トラブル時の基本操作）。
- [ ] 受け入れテストT01〜T14の結果一覧（Pass／Fail／Not tested）。
- [ ] スマートフォン閲覧・CMS編集画面の確認画像または短い画面録画（可能なら）。
- [ ] 本番へ移行する際の注意点・未完了事項一覧。

**検収基準：** T01〜T11・T13・T14がPass、T12は実機でPassが望ましい。CMS経由の画像追加・予定編集、サイト側での自動反映が確認できること。現在のデモの各セクションが欠落しないこと。

## 8. 今回やらないこと／本番移行への引き継ぎ

**Phase 1（後日）**：ご本人のGitHubアカウントの用意、本人がOwnerになれるOrganizationの作成、リポジトリ管理権限の整理。アカウント認証情報を開発担当者に共有しない。

**Phase 4（後日）**：本番Organizationへ完成ファイルを移行、Pages CMSのGitHub Appを本番リポジトリへ改めて許可、CMS共同編集者の招待確認、本人のCloudflareアカウント配下でPagesプロジェクト作成、GitHub連携、ドメイン接続、本番表示の確認。

**本番移行で必ず再確認すること：**

1. `.pages.yml` が本番リポジトリのルートにあり、CMSから見えること。
2. Cloudflare Pagesで**リポジトリのルートを出力先**にすること（静的HTML構成なら、フレームワークなし・追加ビルド不要の想定。ホスティング画面の設定は実際の画面に合わせる）。
3. CMSのメディアパス `/images/...` が本番URLで有効なこと。
4. 本人をCMS編集者として招待し、**本人のスマートフォンで編集→保存→本番反映**まで確認すること。
5. サンプルの予定・文章・画像を除去し、掲載内容と問い合わせ先を本人に承認してもらうこと。
6. アクセス権・バックアップ方法・第三者への引き継ぎ方法をREADMEへ記録すること。

**セキュリティ上の注意：** パスワードやアクセストークンを共有しない。GitHub App権限は必要なリポジトリに限定し、不要になった仮環境のアクセス許可は整理する。`Pages CMS`側の招待情報など一部はリポジトリのファイルではないため、リポジトリを移しただけで招待済み共同編集者が自動的に移行するとは想定しない。

## 9. 参照資料

- 元デモ：<https://github.com/kei487/kei487.github.io/blob/main/demo/index.html>
- Pages CMS 公式：<https://pagescms.org/>
- Pages CMS Quick start：<https://pagescms.org/docs/quick-start/>
- Pages CMS Config overview：<https://pagescms.org/docs/configuration/>
- Pages CMS top-level list：<https://pagescms.org/docs/configuration/content/list/>
- Pages CMS Media：<https://pagescms.org/docs/configuration/media/>
- Pages CMS Collaborators：<https://pagescms.org/docs/configuration/collaborators/>
- Cloudflare Pages Git integration：<https://developers.cloudflare.com/pages/configuration/git-integration/>

**仕様の最終確認日：2026年10月19日。** 外部サービスのUI・仕様は変更されるため、実作業時点の公式ドキュメントを優先する。
