# Experiment log (readable view)

Generated from `experimentos.jsonl` — 164 requests in 7 sequences. Each sequence starts after `POST /__reset`.

## s01

| id | Hypothesis | Request | Status | Response | Conclusion |
|---|---|---|---|---|---|
| 1 | El ejemplo del README responde y muestra el formato base | `{"m":"PING;64"}` | 200 | `{"pong":true}` | PING responde 200 {"pong":true} |
| 2 | Repetir el mismo mensaje da la misma respuesta (sin estado) | `{"m":"PING;64"}` | 200 | `{"pong":true}` | PING es idempotente: misma respuesta al repetir |
| 3 | El número tras ';' es validado (integridad) | `{"m":"PING;65"}` | 200 | `{"pong":true}` | PING no valida el valor del control (65 también pasa) |
| 4 | Mensaje sin ';' | `{"m":"PING"}` | 400 | `{"error":"E103","mensaje":"falta control"}` | Sin ';' → 400 E103 'falta control' |
| 5 | Comando en minúsculas | `{"m":"ping;64"}` | 200 | `{"pong":true}` | El comando no distingue mayúsculas/minúsculas |
| 6 | Comando desconocido | `{"m":"FOO;64"}` | 400 | `{"error":"E202","mensaje":"control inválido"}` | Comando desconocido con control incorrecto → 400 E202: el control se valida antes que el comando |
| 7 | Cuerpo sin campo m | `{"x":"PING;64"}` | 400 | `{"error":"E102","mensaje":"falta m"}` | Cuerpo sin campo m → 400 E102 'falta m' |
| 8 | m no es string | `{"m":123}` | 400 | `{"error":"E102","mensaje":"falta m"}` | m no string → 400 E102 'falta m' |
| 9 | m vacío | `{"m":""}` | 400 | `{"error":"E103","mensaje":"falta control"}` | m vacío → 400 E103 'falta control' |
| 10 | Cuerpo no es JSON | `PING;64` | 400 | `{"error":"E100","mensaje":"json inválido"}` | Cuerpo que no es JSON → 400 E100 'json inválido' |
| 11 | Sin token |  (no token) `{"m":"PING;64"}` | 401 | `{"error":"E001","mensaje":"no autorizado"}` | Sin Authorization → 401 E001 'no autorizado' |
| 12 | Token inválido |  (other token) `{"m":"PING;64"}` | 401 | `{"error":"E001","mensaje":"no autorizado"}` | Token inválido → 401 E001, mismo cuerpo que sin token |
| 13 | GET /msg (método no soportado) | GET `null` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | GET /msg → 404 E404 'ruta desconocida' (no hay 405) |
| 14 | Ruta inexistente | GET /nope `null` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | Ruta inexistente → 404 E404 'ruta desconocida' |
| 15 | Ruta inexistente con POST | /nope `{"m":"PING;64"}` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | POST a ruta inexistente → 404 E404 |
| 16 | GET /health con token | GET /health `null` | 200 | `{"ok":true}` | GET /health con token → 200 {"ok":true} |
| 17 | GET /health sin token | GET /health (no token) `null` | 401 | `{"error":"E001","mensaje":"no autorizado"}` | GET /health sin token → 401 E001: health también exige token |
| 18 | Raíz / | GET / `null` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | GET / → 404 E404 |

## s02

| id | Hypothesis | Request | Status | Response | Conclusion |
|---|---|---|---|---|---|
| 19 | Orden auth vs ruta: ruta inexistente sin token | GET /nope (no token) `null` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | Ruta inexistente sin token → 404 E404: la ruta se evalúa antes que la autenticación |
| 20 | Orden auth vs json: cuerpo inválido sin token |  (no token) `xx` | 401 | `{"error":"E001","mensaje":"no autorizado"}` | Cuerpo inválido sin token en /msg → 401 E001: autenticación antes que el JSON |
| 21 | X-Req: ¿un 401 incrementa el contador? (ver x_req del siguiente) | `{"m":"PING;1"}` | 200 | `{"pong":true}` | X-Req=11: la secuencia empezó con reset y el contador siguió desde 10, así que __reset no reinicia X-Req; los 401/404 no lo incrementan |
| 22 | Control vacío tras ';' | `{"m":"PING;"}` | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | Control vacío ('PING;') → 400 E104 'segmento vacío', aun en PING |
| 23 | Control no numérico en comando desconocido | `{"m":"FOO;abc"}` | 400 | `{"error":"E201","mensaje":"control mal formado"}` | Control no numérico → 400 E201 'control mal formado' |
| 24 | Comando desconocido sin control | `{"m":"FOO;"}` | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | 'FOO;' → E104: el chequeo de segmentos vacíos va antes que el del control |
| 25 | Varios ';' en PING | `{"m":"PING;a;b;64"}` | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | PING con argumentos → 400 E302 'aridad inválida': PING no admite argumentos |
| 26 | Espacios alrededor de m | `{"m":" PING;64 "}` | 400 | `{"error":"E201","mensaje":"control mal formado"}` | Espacios alrededor: ' PING' no es PING; el control '64 ' es mal formado → E201. No se recorta m |
| 27 | Mayúsculas mixtas | `{"m":"PiNg;64"}` | 200 | `{"pong":true}` | Mayúsculas mixtas en el comando se aceptan |
| 28 | Campos extra en el cuerpo | `{"m":"PING;64","extra":1}` | 200 | `{"pong":true}` | Campos extra en el cuerpo se ignoran |
| 29 | Cuerpo JSON array | `[]` | 400 | `{"error":"E102","mensaje":"falta m"}` | Cuerpo JSON array → 400 E102 'falta m' |
| 30 | Cuerpo JSON null | `null` | 400 | `{"error":"E102","mensaje":"falta m"}` | Cuerpo JSON null → 400 E102 |
| 31 | Cuerpo JSON string | `"PING;64"` | 400 | `{"error":"E102","mensaje":"falta m"}` | Cuerpo JSON string → 400 E102 |
| 32 | Cuerpo vacío | `` | 400 | `{"error":"E100","mensaje":"json inválido"}` | Cuerpo vacío → 400 E100 'json inválido' |
| 33 | m es null | `{"m":null}` | 400 | `{"error":"E102","mensaje":"falta m"}` | m null → 400 E102 |
| 34 | Content-Type text/plain con JSON válido | `{"m":"PING;64"}` | 200 | `{"pong":true}` | El Content-Type no importa: text/plain con JSON válido funciona |
| 35 | PUT /msg | PUT `{"m":"PING;64"}` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | PUT /msg → 404 E404 |
| 36 | Barra final /msg/ | /msg/ `{"m":"PING;64"}` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | /msg/ con barra final → 404 E404: rutas exactas |
| 37 | Mayúsculas en ruta /MSG | /MSG `{"m":"PING;64"}` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | /MSG → 404 E404: rutas sensibles a mayúsculas |
| 38 | GET /__reset | GET /__reset `null` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | GET /__reset → 404 E404 |
| 39 | POST /__reset sin token | /__reset (no token) `null` | 401 | `{"error":"E001","mensaje":"no autorizado"}` | POST /__reset sin token → 401 E001 |
| 40 | POST /__reset con token: respuesta exacta | /__reset `null` | 200 | `{"ok":true}` | POST /__reset con token → 200 {"ok":true} |
| 41 | Tras reset, X-Req vuelve a 1 | `{"m":"PING;64"}` | 200 | `{"pong":true}` | X-Req=25 tras reset: confirma que X-Req es un contador por token que __reset no reinicia |

## s03

| id | Hypothesis | Request | Status | Response | Conclusion |
|---|---|---|---|---|---|
| 42 | PING valida formato del control: control no numérico | `{"m":"PING;abc"}` | 200 | `{"pong":true}` | PING no valida ni el formato del control ('abc' pasa) |
| 43 | Orden: aridad inválida + control incorrecto → ¿E302 o E202? | `{"m":"ALTA;Lucia;Gomez;12"}` | 400 | `{"error":"E202","mensaje":"control inválido"}` | Aridad inválida + control incorrecto → E202: el control se valida antes que la aridad |
| 44 | Comando desconocido con control válido → E301 (mensaje con espacio final) | `{"m":"FOO;47"}` | 400 | `{"error":"E301","mensaje":"comando desconocido "}` | Comando desconocido con control válido → 400 E301 'comando desconocido ' (con espacio final) |
| 45 | Control con cero a la izquierda (03 en vez de 3) | `{"m":"ALTA;Mateo;03"}` | 400 | `{"error":"E202","mensaje":"control inválido"}` | Control con cero a la izquierda ('03') → E202: el control se compara como texto exacto |
| 46 | ALTA crea AC-0001 tras reset (y no la creó el 03) | `{"m":"ALTA;Ana;50"}` | 201 | `{"cuentaId":"AC-0001"}` | ALTA → 201 {"cuentaId":"AC-0001"}; ids secuenciales con 4 dígitos |
| 47 | ALTA con nombre repetido: ¿duplica o error? | `{"m":"ALTA;Ana;50"}` | 201 | `{"cuentaId":"AC-0002"}` | ALTA con nombre repetido crea otra cuenta (AC-0002): no hay unicidad de nombre |
| 48 | ALTA con nombre vacío → E104? | `{"m":"ALTA;;85"}` | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | ALTA con nombre vacío → 400 E104 'segmento vacío' |
| 49 | ALTA con nombre con tilde (la tilde se ignora en el control) | `{"m":"ALTA;Lucía;14"}` | 201 | `{"cuentaId":"AC-0003"}` | Nombre con tilde se acepta; la tilde se ignora en el cálculo del control |
| 50 | ALTA con nombre numérico | `{"m":"ALTA;123;18"}` | 201 | `{"cuentaId":"AC-0004"}` | Nombre numérico se acepta |
| 51 | CONSULTA de cuenta nueva: saldo 0 | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":0}` | CONSULTA → 200 {"cuenta_id","saldo"} (snake_case, distinto de ALTA); saldo inicial 0 |
| 52 | CONSULTA con id en minúsculas | `{"m":"CONSULTA;ac-0001;14"}` | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | Los ids de cuenta son sensibles a mayúsculas: 'ac-0001' → 404 E401 |
| 53 | CONSULTA con id mal formado | `{"m":"CONSULTA;XYZ;96"}` | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | Id con formato arbitrario → 404 E401 'cuenta inexistente' (no hay validación de formato) |
| 54 | DEPOSITO monto 0 | `{"m":"DEPOSITO;AC-0001;0;31"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto 0 → 400 E303 'monto inválido' |
| 55 | DEPOSITO monto negativo | `{"m":"DEPOSITO;AC-0001;-5;16"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto negativo → 400 E303 |
| 56 | DEPOSITO monto no numérico | `{"m":"DEPOSITO;AC-0001;abc;13"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto no numérico → 400 E303 |
| 57 | DEPOSITO monto decimal | `{"m":"DEPOSITO;AC-0001;1.5;62"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto decimal → 400 E303: solo enteros positivos |
| 58 | DEPOSITO monto grande (¿límite?) | `{"m":"DEPOSITO;AC-0001;5000000;18"}` | 200 | `{"status":"recieved","operacionId":"OP-0001"}` | DEPOSITO de 5.000.000 se acepta: no hay límite de depósito; respuesta {"status":"recieved","operacionId":"OP-0001"} |
| 59 | DEPOSITO normal → OP-0001 o siguiente | `{"m":"DEPOSITO;AC-0001;300000;48"}` | 200 | `{"status":"recieved","operacionId":"OP-0002"}` | Los ids de operación son secuenciales; los intentos fallidos no consumen id |
| 60 | DEPOSITO a cuenta inexistente → E401 | `{"m":"DEPOSITO;AC-0099;100;89"}` | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | DEPOSITO a cuenta inexistente → 404 E401 |
| 61 | CONSULTA tras depósitos | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":5300000}` | El saldo suma los depósitos |
| 62 | TRANSFER a la misma cuenta | `{"m":"TRANSFER;AC-0001;AC-0001;1000;64"}` | 400 | `{"error":"E304","mensaje":"origen y destino iguales"}` | TRANSFER a la misma cuenta → 400 E304 'origen y destino iguales' |
| 63 | TRANSFER exactamente 100000 (¿límite por operación?) | `{"m":"TRANSFER;AC-0001;AC-0002;100000;12"}` | 200 | `{"status":"recieved","operacionId":"OP-0003"}` | TRANSFER de 100000 con saldo alto se acepta |
| 64 | TRANSFER 100001 (¿límite por operación?) | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 200 | `{"status":"recieved","operacionId":"OP-0004"}` | TRANSFER 100001 → OK a las 10:36. Re-probado en #125 (10:52) → E506: el servicio cambió de versión entre las 10:36 y las 10:44 |
| 65 | TRANSFER desde cuenta inexistente | `{"m":"TRANSFER;AC-0099;AC-0001;10;70"}` | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | TRANSFER desde cuenta inexistente → 404 E401 |
| 66 | TRANSFER a cuenta inexistente | `{"m":"TRANSFER;AC-0001;AC-0099;10;13"}` | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | TRANSFER a cuenta inexistente → 404 E401 |
| 67 | ANULA un DEPOSITO: ¿revierte saldo? | `{"m":"ANULA;OP-0001;72"}` | 200 | `{"ok":true,"anulada":"OP-0001"}` | ANULA de un depósito → 200 {"ok":true,"anulada":"OP-0001"} |
| 68 | CONSULTA tras anular | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":99999}` | Anular un depósito revierte el saldo (5.099.999 − 5.000.000 = 99.999) |
| 69 | ANULA operación inexistente | `{"m":"ANULA;OP-9999;51"}` | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | ANULA de operación inexistente → 404 E402 'operación inexistente' |
| 70 | ANULA con id mal formado | `{"m":"ANULA;XYZ;44"}` | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | ANULA con id arbitrario → 404 E402 |

## s04

| id | Hypothesis | Request | Status | Response | Conclusion |
|---|---|---|---|---|---|
| 71 | Setup: cuenta origen | `{"m":"ALTA;Origen;19"}` | 201 | `{"cuentaId":"AC-0001"}` | Setup: ALTA reinicia la numeración tras reset (AC-0001) |
| 72 | Setup: cuenta destino | `{"m":"ALTA;Destino;41"}` | 201 | `{"cuentaId":"AC-0002"}` | Setup: AC-0002 |
| 73 | Setup: saldo 200000 en AC-0001 | `{"m":"DEPOSITO;AC-0001;200000;27"}` | 200 | `{"status":"recieved","operacionId":"OP-0001"}` | Setup: depósito OP-0001 |
| 74 | Límite = 50% del saldo: 100001 de 200000 → E506 | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | Con saldo 200000, TRANSFER 100001 → 422 E506 "límite excedido" |
| 75 | Límite = 50% del saldo: 100000 de 200000 → OK | `{"m":"TRANSFER;AC-0001;AC-0002;100000;12"}` | 200 | `{"status":"recieved","operacionId":"OP-0002"}` | Con saldo 200000, TRANSFER 100000 → OK: el límite es inclusivo |
| 76 | Con saldo 100000: 50001 → E506 si es 50% | `{"m":"TRANSFER;AC-0001;AC-0002;50001;56"}` | 200 | `{"status":"recieved","operacionId":"OP-0003"}` | Con saldo 100000, TRANSFER 50001 → OK: el límite NO es el 50% del saldo actual |
| 77 | Con saldo 100000: 50000 → OK si es 50% | `{"m":"TRANSFER;AC-0001;AC-0002;50000;59"}` | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` | Saldo 49999, monto 50000 → 422 E507 "saldo insuficiente" |
| 78 | Orden E507 vs E506: monto > saldo (50000) | `{"m":"TRANSFER;AC-0001;AC-0002;60000;32"}` | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` | Monto > saldo → E507 |
| 79 | Saldo destino tras dos transferencias | `{"m":"CONSULTA;AC-0002;11"}` | 200 | `{"cuenta_id":"AC-0002","saldo":150001}` | El destino recibe las transferencias (150001) |
| 80 | ANULA de TRANSFER: ¿revierte ambos lados? | `{"m":"ANULA;OP-0002;69"}` | 200 | `{"ok":true,"anulada":"OP-0002"}` | ANULA de TRANSFER → 200 {ok:true, anulada} |
| 81 | Saldo origen tras anular transfer | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":149999}` | Anular una transferencia devuelve el monto al origen |
| 82 | Saldo destino tras anular transfer | `{"m":"CONSULTA;AC-0002;11"}` | 200 | `{"cuenta_id":"AC-0002","saldo":50001}` | Anular una transferencia lo descuenta del destino |
| 83 | ANULA con id en minúsculas | `{"m":"ANULA;op-0002;69"}` | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | Ids de operación sensibles a mayúsculas: op-0002 → 404 E402 |
| 84 | ANULA repetida → ok:false ya anulada | `{"m":"ANULA;OP-0002;69"}` | 200 | `{"ok":false,"motivo":"ya anulada"}` | Segunda anulación → 200 {ok:false, motivo:"ya anulada"} |
| 85 | ¿Se puede anular una anulación? (¿la anulación tiene id?) | `{"m":"ANULA;OP-0004;63"}` | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | ANULA no crea id de operación (OP-0004 no existe) |
| 86 | Orden E303 vs E401: monto inválido en cuenta inexistente | `{"m":"DEPOSITO;AC-0099;abc;20"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | E303 (monto) se evalúa antes que E401 (cuenta inexistente) |
| 87 | Orden E304 vs E401: misma cuenta inexistente | `{"m":"TRANSFER;AC-0099;AC-0099;10;61"}` | 400 | `{"error":"E304","mensaje":"origen y destino iguales"}` | E304 (origen = destino) se evalúa antes que E401 |
| 88 | Orden E303 vs E304: misma cuenta y monto inválido | `{"m":"TRANSFER;AC-0001;AC-0001;abc;45"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | E303 (monto) se evalúa antes que E304 |
| 89 | Monto con cero a la izquierda | `{"m":"DEPOSITO;AC-0001;0100;19"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto con cero a la izquierda → E303 |
| 90 | Monto con signo + | `{"m":"DEPOSITO;AC-0001;+5;16"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto con signo + → E303 |
| 91 | Monto enorme (más allá de 2^53) | `{"m":"DEPOSITO;AC-0001;99999999999999999999;4"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto de 20 dígitos → E303: existe un tope de tamaño |
| 92 | Saldo tras montos raros | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":149999}` | Los montos inválidos no alteran el saldo |
| 93 | CONSULTA con argumento extra → E302 | `{"m":"CONSULTA;AC-0001;x;65"}` | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | CONSULTA con argumento extra → 400 E302 |
| 94 | DEPOSITO sin monto → E302 | `{"m":"DEPOSITO;AC-0001;4"}` | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | DEPOSITO sin monto → 400 E302 (tras validar el control) |
| 95 | ANULA de operación fallida (no existe id) | `{"m":"ANULA;OP-0099;69"}` | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | ANULA de id inexistente → 404 E402 |

## s05

| id | Hypothesis | Request | Status | Response | Conclusion |
|---|---|---|---|---|---|
| 96 | Setup: cuenta con saldo alto | `{"m":"ALTA;Rica;44"}` | 201 | `{"cuentaId":"AC-0001"}` | Setup |
| 97 | Setup: segunda cuenta | `{"m":"ALTA;Otra;89"}` | 201 | `{"cuentaId":"AC-0002"}` | Setup |
| 98 | Setup: depósito 1000000 | `{"m":"DEPOSITO;AC-0001;1000000;51"}` | 200 | `{"status":"recieved","operacionId":"OP-0001"}` | Setup: depósito 1000000 |
| 99 | Límite = max(100000, saldo/2): 400000 con saldo 1000000 → OK | `{"m":"TRANSFER;AC-0001;AC-0002;400000;75"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | Con saldo 1000000, 400000 → E506: el límite NO es max(100000, saldo/2) |
| 100 | Con saldo 600000: 300001 → E506 (mitad = 300000) | `{"m":"TRANSFER;AC-0001;AC-0002;300001;51"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | 300001 → E506 (segundo rechazo por límite) |
| 101 | Con saldo 600000: 300000 → OK (justo la mitad) | `{"m":"TRANSFER;AC-0001;AC-0002;300000;54"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | 300000 → E506 (tercer rechazo): el límite es menor que 300000 |
| 102 | Con saldo 300000: 150000 → OK | `{"m":"TRANSFER;AC-0001;AC-0002;150000;71"}` | 409 | `{"error":"E510","mensaje":"cuenta bloqueada"}` | Tras 3 E506, TRANSFER → 409 E510 "cuenta bloqueada" |
| 103 | Con saldo 150000: 100000 → OK (el piso de 100000 manda) | `{"m":"TRANSFER;AC-0001;AC-0002;100000;12"}` | 409 | `{"error":"E510","mensaje":"cuenta bloqueada"}` | Bloqueada aun con monto dentro del límite |
| 104 | Orden E507 vs E506: saldo 50000, monto 200000 (supera ambos) | `{"m":"TRANSFER;AC-0001;AC-0002;200000;33"}` | 409 | `{"error":"E510","mensaje":"cuenta bloqueada"}` | E510 se evalúa antes que E506 |
| 105 | Saldo 50000, monto 60000 (solo supera saldo) → E507 | `{"m":"TRANSFER;AC-0001;AC-0002;60000;32"}` | 409 | `{"error":"E510","mensaje":"cuenta bloqueada"}` | E510 se evalúa antes que E507 |
| 106 | Saldo origen esperado 50000 | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":1000000}` | CONSULTA funciona con la cuenta bloqueada y no expone el bloqueo; los rechazos no movieron saldo |
| 107 | Setup: tercera cuenta | `{"m":"ALTA;Tercera;40"}` | 201 | `{"cuentaId":"AC-0003"}` | Setup |
| 108 | AC-0002 (saldo 950000) transfiere 475000 a AC-0003 (límite = mitad) | `{"m":"TRANSFER;AC-0002;AC-0003;475000;78"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | Con saldo 0, monto 475000 → E506: el límite se evalúa antes que el saldo (E507) |
| 109 | AC-0002 (saldo 475000) transfiere 237500 | `{"m":"TRANSFER;AC-0002;AC-0003;237500;16"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | E506 |
| 110 | AC-0002 (saldo 237500) transfiere 118750 | `{"m":"TRANSFER;AC-0002;AC-0003;118750;82"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | E506 (tercero para AC-0002) |
| 111 | ANULA de transfer cuyo destino ya no tiene fondos (AC-0002 tiene 118750, debe devolver 400000): ¿error o saldo negativo? | `{"m":"ANULA;OP-0002;69"}` | 404 | `{"error":"E402","mensaje":"operación inexistente"}` | Las transferencias rechazadas no generan id de operación (OP-0002 no existe) |
| 112 | Saldo AC-0002 tras esa anulación | `{"m":"CONSULTA;AC-0002;11"}` | 200 | `{"cuenta_id":"AC-0002","saldo":0}` | Los rechazos no movieron saldo |
| 113 | Saldo AC-0001 tras esa anulación | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":1000000}` | Sin cambios |
| 114 | ANULA de depósito con saldo insuficiente en la cuenta (OP-0001 = 1000000) | `{"m":"ANULA;OP-0001;72"}` | 200 | `{"ok":true,"anulada":"OP-0001"}` | ANULA funciona sobre operaciones de una cuenta bloqueada |
| 115 | Saldo AC-0001 tras anular el depósito | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":0}` | Anular el depósito deja el saldo en 0 |
| 116 | Monto máximo seguro 2^53-1 | `{"m":"DEPOSITO;AC-0003;9007199254740991;13"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto 9007199254740991 → E303: hay un tope inferior a 2^53 |
| 117 | Monto 2^53 | `{"m":"DEPOSITO;AC-0003;9007199254740992;10"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto 2^53 → E303 |
| 118 | Monto de 10 dígitos | `{"m":"DEPOSITO;AC-0003;1000000000;43"}` | 200 | `{"status":"recieved","operacionId":"OP-0002"}` | Monto 1000000000 (10 dígitos) → OK |
| 119 | Monto de 13 dígitos | `{"m":"DEPOSITO;AC-0003;1000000000000;97"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto 1000000000000 → E303 |
| 120 | Nombre con espacio | `{"m":"ALTA;Ana Maria;44"}` | 201 | `{"cuentaId":"AC-0004"}` | Nombre con espacios se acepta |
| 121 | Nombre muy largo (120 caracteres) | `{"m":"ALTA;XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX;86"}` | 201 | `{"cuentaId":"AC-0005"}` | Nombre de 120 caracteres se acepta |

## s06

| id | Hypothesis | Request | Status | Response | Conclusion |
|---|---|---|---|---|---|
| 122 | Setup: cuenta A | `{"m":"ALTA;A;62"}` | 201 | `{"cuentaId":"AC-0001"}` | Setup |
| 123 | Setup: cuenta B | `{"m":"ALTA;B;59"}` | 201 | `{"cuentaId":"AC-0002"}` | Setup |
| 124 | Repetir condición de s03 (#64): saldo 5300000 | `{"m":"DEPOSITO;AC-0001;5300000;81"}` | 200 | `{"status":"recieved","operacionId":"OP-0001"}` | Setup: saldo 5300000, misma condición que s03 |
| 125 | ¿100001 pasa ahora como en #64? Si falla: límite fijo 100000 y cambió la versión | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | Con saldo 5300000, TRANSFER 100001 → E506. Contradice #64 (10:36): cambio de versión durante el día; el límite actual es 100000 fijo |
| 126 | 100000 → OK (límite inclusivo) | `{"m":"TRANSFER;AC-0001;AC-0002;100000;12"}` | 200 | `{"status":"recieved","operacionId":"OP-0002"}` | TRANSFER 100000 → OK: límite inclusivo, independiente del saldo |
| 127 | Segundo E506 | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | Segundo E506 (no consecutivo) |
| 128 | Una transferencia exitosa: ¿reinicia el contador de E506? | `{"m":"TRANSFER;AC-0001;AC-0002;50;87"}` | 200 | `{"status":"recieved","operacionId":"OP-0003"}` | Transferencia exitosa entre rechazos |
| 129 | Tercer E506 en total (segundo consecutivo) | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | Tercer E506 en total, no consecutivo |
| 130 | ¿Bloqueada tras 3 E506 en total? (si OK: el contador es de consecutivos) | `{"m":"TRANSFER;AC-0001;AC-0002;50;87"}` | 200 | `{"status":"recieved","operacionId":"OP-0004"}` | No se bloquea tras 3 E506 no consecutivos: el contador es de rechazos CONSECUTIVOS y un éxito lo reinicia |
| 131 | E506 adicional | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | E506 consecutivo 1 |
| 132 | E506 adicional | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | E506 consecutivo 2 |
| 133 | E506 adicional | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | E506 consecutivo 3 |
| 134 | Ya debería estar bloqueada | `{"m":"TRANSFER;AC-0001;AC-0002;50;87"}` | 409 | `{"error":"E510","mensaje":"cuenta bloqueada"}` | Tras 3 E506 consecutivos → 409 E510 "cuenta bloqueada", incluso con monto válido |
| 135 | DEPOSITO a cuenta bloqueada | `{"m":"DEPOSITO;AC-0001;10;77"}` | 200 | `{"status":"recieved","operacionId":"OP-0005"}` | Una cuenta bloqueada sí acepta depósitos |
| 136 | Cuenta bloqueada como destino | `{"m":"TRANSFER;AC-0002;AC-0001;10;70"}` | 200 | `{"status":"recieved","operacionId":"OP-0006"}` | Una cuenta bloqueada sí recibe transferencias (el bloqueo es solo como origen) |
| 137 | Orden E304 vs E510: bloqueada a sí misma | `{"m":"TRANSFER;AC-0001;AC-0001;10;22"}` | 400 | `{"error":"E304","mensaje":"origen y destino iguales"}` | E304 (origen = destino) se evalúa antes que E510 |
| 138 | Orden E401 vs E510: bloqueada a inexistente | `{"m":"TRANSFER;AC-0001;AC-0099;10;13"}` | 404 | `{"error":"E401","mensaje":"cuenta inexistente"}` | E401 (cuenta inexistente) se evalúa antes que E510 |
| 139 | Orden E303 vs E510: monto inválido | `{"m":"TRANSFER;AC-0001;AC-0002;abc;52"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | E303 (monto inválido) se evalúa antes que E510 |
| 140 | ANULA de una operación de la cuenta bloqueada | `{"m":"ANULA;OP-0001;72"}` | 200 | `{"ok":true,"anulada":"OP-0001"}` | ANULA funciona sobre operaciones de una cuenta bloqueada |
| 141 | CONSULTA de cuenta bloqueada (¿expone el bloqueo?) | `{"m":"CONSULTA;AC-0001;14"}` | 200 | `{"cuenta_id":"AC-0001","saldo":-100080}` | Anular un depósito deja el saldo negativo (-100080): las anulaciones no validan saldo |
| 142 | Monto 10 dígitos 9999999999 | `{"m":"DEPOSITO;AC-0002;9999999999;51"}` | 200 | `{"status":"recieved","operacionId":"OP-0007"}` | Monto 9999999999 (10 dígitos) → OK |
| 143 | Monto 11 dígitos 10000000000 | `{"m":"DEPOSITO;AC-0002;10000000000;48"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto 10000000000 (11 dígitos) → E303: máximo 9999999999 |
| 144 | Monto 11 dígitos 99999999999 | `{"m":"DEPOSITO;AC-0002;99999999999;86"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto de 11 dígitos → E303 |
| 145 | Monto 12 dígitos 999999999999 | `{"m":"DEPOSITO;AC-0002;999999999999;48"}` | 400 | `{"error":"E303","mensaje":"monto inválido"}` | Monto de 12 dígitos → E303 |

## s07

| id | Hypothesis | Request | Status | Response | Conclusion |
|---|---|---|---|---|---|
| 146 | Setup: cuenta A | `{"m":"ALTA;A;62"}` | 201 | `{"cuentaId":"AC-0001"}` | Setup |
| 147 | Setup: cuenta B | `{"m":"ALTA;B;59"}` | 201 | `{"cuentaId":"AC-0002"}` | Setup |
| 148 | Setup: saldo 50000 en A | `{"m":"DEPOSITO;AC-0001;50000;39"}` | 200 | `{"status":"recieved","operacionId":"OP-0001"}` | Setup: saldo 50000 en AC-0001 |
| 149 | Contador de bloqueo: E506 #1 | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | Rechazo consecutivo 1 (E506) |
| 150 | Contador de bloqueo: E506 #2 | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 422 | `{"error":"E506","mensaje":"límite excedido"}` | Rechazo consecutivo 2 (E506) |
| 151 | ¿Un E507 (saldo insuficiente) reinicia el contador de E506? | `{"m":"TRANSFER;AC-0001;AC-0002;60000;32"}` | 422 | `{"error":"E507","mensaje":"saldo insuficiente"}` | Monto dentro del límite pero mayor al saldo → 422 E507; es el tercer rechazo consecutivo |
| 152 | E506 tras el E507: si el E507 no reinicia, este es el 3.º consecutivo | `{"m":"TRANSFER;AC-0001;AC-0002;100001;9"}` | 409 | `{"error":"E510","mensaje":"cuenta bloqueada"}` | Tras E506, E506, E507 → 409 E510: el E507 también cuenta para el bloqueo; el contador es de transferencias rechazadas consecutivas (E506 o E507) |
| 153 | Si sale E510: el E507 no reinicia el contador; si sale OK: sí lo reinicia | `{"m":"TRANSFER;AC-0001;AC-0002;10;13"}` | 409 | `{"error":"E510","mensaje":"cuenta bloqueada"}` | Bloqueada aun con monto válido (10): confirma que el E507 de #151 fue el tercer rechazo y no reinició el contador |
| 154 | Aridad vs monto: DEPOSITO con argumento extra y monto inválido → ¿E302 o E303? | `{"m":"DEPOSITO;AC-0001;abc;x;62"}` | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | Aridad inválida + monto inválido → 400 E302: la aridad (E302) se evalúa antes que el monto (E303) |
| 155 | Aridad vs cuenta inexistente: CONSULTA con argumento extra sobre cuenta inexistente | `{"m":"CONSULTA;AC-0099;x;56"}` | 400 | `{"error":"E302","mensaje":"aridad inválida"}` | Aridad inválida + cuenta inexistente → 400 E302: la aridad (E302) se evalúa antes que la cuenta (E401) |
| 156 | Segmento vacío en medio del mensaje | `{"m":"ALTA;;Ana;50"}` | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | Segmento vacío en medio del mensaje → 400 E104 'segmento vacío', antes que el control y la aridad |
| 157 | Nombre con solo espacios (segmento no vacío) | `{"m":"ALTA;   ;85"}` | 201 | `{"cuentaId":"AC-0003"}` | Nombre de solo espacios se acepta (AC-0003): un segmento con espacios no es vacío; no se recorta |
| 158 | Nombre con salto de línea | `{"m":"ALTA;Ana\nMaria;44"}` | 201 | `{"cuentaId":"AC-0004"}` | Nombre con salto de línea se acepta (AC-0004); el salto de línea se ignora en el cálculo del control |
| 159 | Claves JSON duplicadas: ¿gana la primera o la última m? | `{"m":"PING;1","m":123}` | 400 | `{"error":"E102","mensaje":"falta m"}` | Claves JSON duplicadas: gana la última m (123, no string) → 400 E102 'falta m' |
| 160 | Query string en /msg: ¿se ignora o es ruta desconocida? | /msg?x=1 `{"m":"PING;1"}` | 200 | `{"pong":true}` | El query string se ignora en /msg: /msg?x=1 responde como /msg e incrementa X-Req |
| 161 | Query string en /health | GET /health?x=1 `null` | 200 | `{"ok":true}` | El query string se ignora en /health: /health?x=1 → 200 {"ok":true} |
| 162 | HEAD /health | HEAD /health `null` | 404 | `` | HEAD /health → 404 con cuerpo vacío: HEAD no es un método válido (no hay cuerpo por ser HEAD) |
| 163 | OPTIONS /msg (preflight CORS) | OPTIONS `null` | 404 | `{"error":"E404","mensaje":"ruta desconocida"}` | OPTIONS /msg → 404 E404: no hay soporte de CORS/preflight |
| 164 | Comando vacío con control | `{"m":";1"}` | 400 | `{"error":"E104","mensaje":"segmento vacío"}` | Comando vacío (';1') → 400 E104 'segmento vacío' |
