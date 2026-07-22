# Durak

Joc Durak pentru un jucător contra boților sau multiplayer cu prietenii prin PeerJS.

## Joacă online

Deschide [Durak MD](https://creacreative.github.io/durak-md/) direct în browser.

## Pornire

Deschide `index.html` într-un browser modern. Singleplayer funcționează offline.

Pentru multiplayer, alege **Multiplayer**, scrie numele și creează o cameră. Trimite codul celorlalți jucători; ei aleg **Intră în cameră** și introduc codul. Gazda pornește partida când sunt conectați 2–6 jucători.

PeerJS este inclus local în folderul `vendor`, dar multiplayerul are nevoie de internet pentru găsirea și conectarea jucătorilor. Toți trebuie să deschidă aceeași copie publicată a jocului (de exemplu pe GitHub Pages, Netlify sau alt server static).

## Lobby și nickname

Jocul nu cere autentificare. La deschidere alegi un nickname în lobby; numele este păstrat local în browser și este folosit automat în camerele multiplayer. Camerele private PeerJS se creează sau se accesează prin cod.

## Reguli rapide

- Atacatorul joacă o carte; apărătorul trebuie să pună una mai mare de aceeași culoare sau un atu.
- Cărțile suplimentare de atac trebuie să aibă o valoare deja prezentă pe masă.
- Dacă nu poți apăra, iei toate cărțile de pe masă.
- Câștigă primul jucător care rămâne fără cărți după terminarea pachetului.
