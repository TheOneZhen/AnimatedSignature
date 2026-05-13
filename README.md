# Animated Signature

这是一个简单的小工具，灵感来自于[@antfu](https://antfu.me/)的一篇文章——[Animated Svg Logo](https://antfu.me/posts/animated-svg-logo)，本人只是在大佬的基础上做了一点小小的修饰。同时结合一款非常优秀的工具[signature_pad](https://github.com/szimek/signature_pad)来辅助生成动态签名，感兴趣的同学可以前去观摩一下。

## starting

你可以通过`npm`安装`Z-Animated-Signature`：

```
npm install Z-Animated-Signature
```

然后在你需要的地方引用它：

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
## todo