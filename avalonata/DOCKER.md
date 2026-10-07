# Avalon in Docker

Richiede Docker Desktop avviato in modalità container Linux, oppure Docker Engine e Compose su Linux.

Nella cartella contenente `Dockerfile` e `compose.yaml`:

```sh
docker compose up --build -d
```

Aprire http://localhost:8788. Il gioco completo usa accessi ospite: ciascuno sceglie il nome dal proprio browser. Creare una stanza e condividere il codice con gli altri sette giocatori.

Per fermarlo: `docker compose down`. Il volume `avalon-data` conserva le stanze e la chiave dei cookie tra i riavvii; le stanze scadono dopo 48 ore senza azioni. Usare una sola replica del container.

## Telefono o dominio

Per accedere dalla stessa rete Wi-Fi, creare un file `.env` accanto a `compose.yaml`, sostituendo l’indirizzo di esempio con l’IP del computer:

```dotenv
AVALON_PUBLIC_ORIGINS=http://localhost:8788,http://192.168.1.20:8788
```

Eseguire di nuovo `docker compose up -d`, poi aprire l’indirizzo del computer dal telefono. Il firewall del computer deve consentire la porta 8788 sulla rete privata.

Su un server con dominio e reverse proxy HTTPS, impostare `AVALON_PUBLIC_ORIGINS=https://gioco.example.com`. Il proxy deve inoltrare l’header Host originale alla porta 8788. Il sito verifica l’origine delle richieste e non si fida di header di identità forniti dai visitatori. Su HTTPS i cookie sono Secure. Il Dockerfile avvia il gioco; non registra un dominio né pubblica automaticamente un collegamento Internet.

## Senza Compose

```sh
docker build -t avalon-club .
docker run -d --init --name avalon -p 8788:8788 -v avalon-data:/data avalon-club
```

## HTML

Questa consegna esclude l’HTML dimostrativo: la pagina iniziale e le stanze sono servite dal gioco completo. Caricare tutti i file e le sottocartelle del pacchetto, non soltanto il Dockerfile. I caratteri Google sono facoltativi e hanno alternative locali se si è offline.

## Verifica

Il motore, il server ospiti e la build del progetto sono stati verificati localmente. Docker non è installato nell’ambiente di preparazione: la build dell’immagine e l’avvio del container non sono stati eseguiti qui.
