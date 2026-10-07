# Avalon: caricamento su GitHub e pubblicazione

## 1. Estrai il pacchetto

Scarica `AVALON-MULTIPLAYER.zip`, fai clic destro e scegli **Estrai tutto**. Apri la cartella estratta: devi vedere subito `Dockerfile`, `package.json`, `railway.json`, `app`, `public` e `scripts`.

## 2. Carica i file estratti

Nel repository GitHub `marcorivero9222/avalonata`, elimina i due file attuali `dockerfile` (tutto minuscolo) e `index.html`. Questa consegna contiene solo il gioco multiplayer. Il nuovo file deve chiamarsi esattamente `Dockerfile`, con D maiuscola.

Scegli **Add file → Upload files**. Trascina TUTTO il contenuto della cartella estratta, incluse le sottocartelle e i file che iniziano con un punto. Conferma con **Commit changes**.

**Non caricare lo ZIP. Non trascinare la cartella esterna come un unico livello aggiuntivo. Non rinominare Dockerfile.**

Nella pagina principale del repository devono comparire, allo stesso livello:

```text
Dockerfile
railway.json
package.json
package-lock.json
vite.config.ts
.openai/
app/
build/
db/
drizzle/
lib/
public/
scripts/
tests/
...gli altri file del pacchetto
```

## 3. Riparti su Railway

Apri il servizio collegato al repository AVALON. Lascia **Root Directory** vuota oppure `/`: il Dockerfile è nella cartella principale. Rimuovi eventuali vecchi percorsi `Dockerfile.Avalon` e comandi di avvio personalizzati. Il nuovo `railway.json` imposta Dockerfile, avvio e controllo dello stato.

Per conservare stanze e sessioni tra i deployment, aggiungi un **Volume** al servizio con percorso di montaggio `/data`. Mantieni una sola replica. Senza volume il gioco può partire, ma i dati possono andare persi quando il container viene ricreato. L’inizializzatore prepara i permessi della cartella dati, poi esegue il gioco con un utente non privilegiato.

Avvia un nuovo deployment. Quando è attivo, vai in **Settings → Networking → Generate Domain**. Il server usa la variabile `PORT` e riconosce il dominio fornito da `RAILWAY_PUBLIC_DOMAIN`. Se imposti una porta di destinazione manualmente, deve coincidere con `PORT` (8788 quando non impostata). Se generi il dominio dopo l’avvio, riavvia il servizio affinché legga la nuova variabile.

Apri il link HTTPS, scegli il nome, crea una stanza e condividi il codice con gli altri sette giocatori. Ciascuno deve usare il proprio browser/dispositivo. Per un dominio personalizzato aggiuntivo usa `AVALON_PUBLIC_ORIGINS=https://tuo-dominio.it` nelle variabili del servizio.

## La versione corretta

La pagina iniziale deve mostrare **Crea stanza** e **Inserisci codice**. Dopo l’ingresso compaiono codice della stanza, partecipanti, **Sono pronto** e **Inizia partita**. I ruoli sono assegnati dal server quando tutti e otto sono pronti. Il pulsante Inizia partita è disponibile per chi ha creato la stanza.

## Avvio locale

Con Docker Desktop avviato, dalla cartella estratta:

```sh
docker compose up --build -d
```

Apri http://localhost:8788. Per fermare il container: `docker compose down`.

## Verifiche e limiti

Verificati localmente: compilazione del progetto, regole di gioco, otto sessioni separate, visioni dei ruoli, controlli di origine, configurazione della porta e del dominio. Docker non è installato nell’ambiente di preparazione: l’immagine Linux e il deployment Railway devono ancora essere verificati sulla piattaforma.

Documentazione ufficiale: [Dockerfile](https://docs.railway.com/builds/dockerfiles), [configurazione](https://docs.railway.com/config-as-code/reference), [variabili](https://docs.railway.com/variables/reference), [volumi](https://docs.railway.com/volumes).
