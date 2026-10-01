<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- La tienda HTML incrustada se comunica con la ruta principal por mensajes restringidos al mismo origen; la ruta usa la sesión real y la función atómica de la base de datos para consumir premios, porque el HTML de la tienda no debe decidir elegibilidad ni uso único.
