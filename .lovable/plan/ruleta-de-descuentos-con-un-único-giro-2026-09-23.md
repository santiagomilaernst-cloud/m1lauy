# Ruleta de descuentos con un único giro

## Objetivo
Añadir “Ruleta de descuentos” en la franja superior de la tienda. Al pulsarla, se desplegará una ruleta colorida y funcional que exige iniciar sesión y permite exactamente un giro por persona.

## Experiencia
- Reemplazar el espacio del evento superior por un acceso compacto llamado “Ruleta de descuentos”.
- Abrir un panel adaptable con una ruleta animada, indicador fijo, botón de giro y estado del premio.
- Mostrar premios repetidos del 1% al 12% para que sean los resultados habituales.
- Incluir premios especiales con estas probabilidades reales por giro: 20% de descuento = 2%; 50% de descuento = 0,5%; par gratis = 0,004%.
- Dar al segmento “Par gratis” un brillo destacado y una presencia visual tentadora, sin alterar su probabilidad real ni presentar un resultado falso.
- Tras el giro, mostrar el premio obtenido y conservarlo en la cuenta para que pueda usarse después.

## Acceso y control del giro
- Añadir inicio de sesión y registro con correo/contraseña y Google desde la propia ruleta.
- Bloquear el botón de giro hasta que la persona inicie sesión.
- Guardar el resultado en Lovable Cloud y aplicar una restricción única por usuario, evitando segundos giros incluso desde otro dispositivo o tras borrar los datos del navegador.
- Realizar el sorteo de forma protegida fuera del navegador, con selección aleatoria ponderada y una operación única para impedir dobles solicitudes.

## Validación
- Comprobar apertura y cierre de la ruleta en computadora y celular.
- Probar registro, inicio y cierre de sesión.
- Confirmar que el primer giro queda guardado y que cualquier intento posterior muestra el premio ya obtenido.
- Verificar visualmente animación, colores, brillo del premio mayor y ausencia de superposiciones.

## Nota técnica
La probabilidad de “Par gratis” se interpretará como 0,004% (aproximadamente 1 entre 25.000). El 97,496% restante se repartirá entre los descuentos del 1% al 12%.
