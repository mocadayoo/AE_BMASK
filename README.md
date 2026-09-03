# BBox Tools

選択した`layer`の`Bounding Box`をもとに、`Mask`または`Track Matte`を生成するAfter Effects向けの`script`です。  
`layer`の表示範囲を固定したまま中身だけを移動させるような、文字・Shape Animationなどに利用できます。

## Options

### Adjust Layer Length

生成する`BBox Matte`の`inPoint` / `outPoint`を、処理対象の`layer`と同じ長さにします。

### Follow Text Movement

生成した`BBox Matte`の`Transform`を、処理対象の`layer`へ追従させます。

無効の場合は生成時点の位置に`BBox`が固定されるため、`layer`だけを動かして枠外へ隠すようなAnimationに利用できます。

## License

MIT License. See [LICENSE](./LICENSE).