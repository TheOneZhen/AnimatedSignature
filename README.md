# Animated Signature

This is a simple utility inspired by [@antfu](https://antfu.me/)'s article, [Animated Svg Logo](https://antfu.me/posts/animated-svg-logo). I only made a few small tweaks based on his excellent work, and combined it with the outstanding [signature_pad](https://github.com/szimek/signature_pad) tool to help generate animated signatures. Feel free to check them out if you're interested.

> 这是一个简单的小工具，灵感来自于[@antfu](https://antfu.me/)的一篇文章——[Animated Svg Logo](https://antfu.me/posts/animated-svg-logo)，本人只是在大佬的基础上做了一点小小的修饰。同时结合一款非常优秀的工具[signature_pad](https://github.com/szimek/signature_pad)来辅助生成动态签名，感兴趣的同学可以前去观摩一下。

## starting(开始)

You can install `Z-Animated-Signature` via `npm`:

> 你可以通过`npm`安装`Z-Animated-Signature`：

```
npm install Z-Animated-Signature
```

Then you can use it in your project:

> 然后在你需要的地方引用它：

``` ts
import { AnimatedSignature } from 'Z-Animated-Signature'

const canvas = document.getElementById("canvas") as HTMLCanvasElement;
const animatedSignature = new AnimatedSignature(
  canvas,
  {
    duration: [1000],
    gap: 0,
    drawingMode: "parallel",
  },
  {
    backgroundColor: "white"
  }
);
```
## features(功能)

- [x] Support two modes: even speed and proportional length of stroke
  > 支持匀速播放和按笔画长度比例播放两种模式
- [x] Support generating SVG code and CSS styles
  > 支持生成SVG代码和CSS样式

