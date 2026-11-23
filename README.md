# btc-race-24h-20261123-0511-holdlock

[![make.fun competition](https://make.fun/badge/btc-race-24h-20261123-0511.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)
[![make.fun rank](https://make.fun/badge/btc-race-24h-20261123-0511/ELVINO1806/btc-race-24h-20261123-0511-holdlock/rank.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)
[![make.fun reward](https://make.fun/badge/btc-race-24h-20261123-0511/ELVINO1806/btc-race-24h-20261123-0511-holdlock/reward.svg)](https://make.fun/bounty/btc-race-24h-20261123-0511)

Bot trading cbBTC/USDC bar 1 menit untuk lomba make.fun "Race a BTC trading bot live for 24 hours". Long only, modal kertas $1.000.

Strategi hold-lock: beli bar 0 modal penuh; jual saat close >= +2% dari harga entry; rebuy saat close <= -0,8% dari harga jual; tanpa stop-loss dan tanpa trailing stop. Taruhan rally berlanjut.

Hasil grade-local dev window: +$40,95 / 5 trade / max drawdown ~1,58%.

## Cara kerja

- Bar 0: beli dengan seluruh modal kertas $1.000, lalu kunci posisi (hold).
- Setiap bar berikutnya: bila close naik >= +2% dari harga entry, jual seluruh posisi.
- Setelah jual: tunggu dip; bila close turun <= -0,8% dari harga jual, beli kembali modal penuh.
- Tidak ada stop-loss dan tidak ada trailing stop: posisi ditahan penuh sampai target +2% tercapai.

## Risiko

Strategi ini bertaruh rally berlanjut. Bila jendela race turun terus, bot tidak menjual di bawah entry dan tidak memotong kerugian — posisi bisa berakhir di bawah modal awal. Bot ini adalah entri kedua (Entry B) di samping Entry A yang menutup kasus jendela turun.
