# 词汇图片素材来源策略 V1.0

## 原则
词汇图片采用“**授权明确的互联网素材优先，找不到合适素材再生成**”的流程，但视觉一致性和儿童可识别性优先于“必须使用现成图片”。

## 搜索与选用顺序
1. Public Domain / CC0 素材；
2. 允许项目用途的开放许可证素材（例如可满足归属要求的 Creative Commons），必须记录作者、来源 URL、许可证；
3. 其他明确允许复用且符合项目用途的素材；
4. 没有合适素材，或现成素材与项目 3D 玩具/黏土风明显冲突时，使用生成式图片补齐。

不得直接从 Google 图片、百度图片、Pinterest、小红书等搜索结果复制版权状态不明的图片。

## 视觉验收
即使许可证允许，仍须符合 `docs/vocabulary-asset-style-guide.md`：
- 单主体、1:1；
- 儿童 3D 玩具 / 黏土 / 软陶风；
- 浅色简洁背景；
- 高识别度；
- 无文字、水印、Logo；
- 与已确认的 apple / elephant / bus 参考风格一致。

## 入库与追踪
正式素材放在 `frontend/public/vocabulary-assets/`，文件名按英文词规范化。
`data/vocabulary-assets-manifest.json` 记录来源。互联网素材必须填写：
- sourceType = web
- sourceUrl
- author（若有）
- license
- retrievedAt

生成素材填写 sourceType = generated。

## 当前首批
第 1 单元的 apple、banana、orange、pear、peach、grape、strawberry、watermelon、lemon、mango 已按确认风格生成并入库。
