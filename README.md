# かんたんライフプラン診断

子育て期の養育費と、成人後の老後資金が持つかを、少ない入力でスマホ1画面のサマリーにまとめる静的サイトです。

## 使い方

1. `index.html` をブラウザで開きます。
2. 年齢、人数、月収、生活費、金融資産、支出イベントを入力します。
3. `診断してみる` を押すと結果が更新されます。
4. `結果を画像で保存` でPNGを書き出せます。

## 公開

このリポジトリは GitHub Actions 経由で GitHub Pages に公開する想定です。

- 公開URL想定: `https://yskmjp.github.io/codex-cashflow/`
- GitHub 側で `Settings -> Pages -> Source` を `GitHub Actions` にしてください。

## 構成

- `index.html`: 画面本体
- `styles.css`: スタイル
- `app.js`: フォーム、簡易シミュレーション、画像保存
- `.github/workflows/pages.yml`: GitHub Pages デプロイ

## 補足

- 計算は簡易ロジックです。
- 年金は月収からの推定です。
- 子どもの年齢差は3歳差で仮置きしています。
