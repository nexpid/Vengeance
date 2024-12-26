<h1 align="center">🗿 Vengeance</h1>

## ❓ What is Vengeance?

**Vengeance**[^1] is a **proof-of-concept in-beta fork** of [Revenge Rewrite](https://github.com/revenge-mod/revenge-rewrite), inspired by [Vencord](https://github.com/Vendicated/Vencord)

## ❔ How do I use Vengeance?

You must first use [Revenge Rewrite](https://github.com/revenge-mod/revenge-rewrite). Go to Revenge's Developer settings, press the "Evaluate JavaScript" button and paste in this code:

```js
revenge.modules.native.FileModule.writeFile(
  "documents",
  "/pyoncord/loader.json",
  '{"customLoadUrl":{"enabled":true,"url":"https://github.com/nexpid/Vengeance/releases/download/bundle/revenge.min.js"}}',
  "utf8"
)
  .then(() => "Vengeance loaded! Reload to apply.")
  .catch(() => "Something went wrong!");
```

> [!WARNING]
> Do not run random pieces of code unless you know what they're doing. This code edits the `pyoncord/loader.json` file in the app's `documents` to load Vengeance's bundle instead of Revenge's.

## ❓ I encountered an issue! How do I report it?

Ping **@nexpid** in the Revenge Discord for further help. You can also [create an issue](https://github.com/nexpid/Vengeance/issues/new), but reporting through Discord is usually faster.

---

<p align="center">
    Consider <a href="https://github.com/nexpid/Vengeance/stargazers">🌟 starring Vengeance</a>!
</p>

[^1]: vengeance; noun; synonym of "revenge" and "vendetta"
