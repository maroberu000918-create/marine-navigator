マリンナビ日本 Webアプリ 試作版

【重要】このZIPはiPhoneに直接インストールするアプリではなく、HTTPS対応のWebサーバーに公開してSafariからホーム画面に追加するためのファイル一式です。

■ 現在できること
・OpenStreetMap地図表示
・iPhone/PCのGPS現在地表示（位置情報の許可が必要）
・GPS航跡の記録、距離計算、GPX出力
・ホーム画面追加用Webアプリ設定
・気象庁潮位表、Windy、海上保安庁情報へのリンク

■ 未実装・未接続
・水深データの実数値表示、等深線
・風向/風速の矢印と数値を地図上に表示する実データ連携
・潮流矢印と流速の実データ連携
・満潮/干潮の時刻をアプリ内に自動表示する機能（現状は気象庁ページへのリンク）
画面上のレイヤー切替は現時点では準備用UIで、実データは表示しません。架空の海況データは生成しません。

■ 公開方法（無料の例：GitHub Pages）
1. WindowsでZIPを右クリック→「すべて展開」。
2. GitHubアカウントを作成/ログインし、新しいPublic repositoryを作成。
3. 展開したフォルダ内のファイル一式（index.html, style.css, app.js, manifest.webmanifest, sw.js, icon-192.png, icon-512.png）をリポジトリの一番上にアップロード。
4. GitHubのSettings → Pages → Deploy from a branch → main / root → Save。
5. 公開URL（https://ユーザー名.github.io/リポジトリ名/）をiPhoneのSafariで開く。
6. Safariの共有ボタン →「ホーム画面に追加」→「追加」。

■ 注意
・iPhoneのGPSはHTTPSページで位置情報の許可が必要です。
・地図タイルはインターネット接続が必要です。オフライン地図ではありません。
・GitHub Pages等の公開URLは、URLを知る人がアクセスできる場合があります。個人情報やAPIキーを公開ファイルに書かないでください。
・航海用電子海図/航海計器ではありません。航行判断に使用しないでください。
