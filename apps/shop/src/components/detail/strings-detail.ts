import { plural } from "./format";

export const details = {
	prevImage: "Prethodna slika",
	nextImage: "Sljedeća slika",
	closeViewer: "Zatvori prikaz slike",
	openViewer: (n: number, total: number) => `Otvori sliku ${n} od ${total}`,
	showImage: (n: number) => `Prikaži sliku ${n}`,
	description: "Opis",
	specs: "Karakteristike",
	delivery: "Dostava",
	shipping: "Dostava",
	shippingPrice: (km: number) => `Dostava ${km} KM`,
	freeShipping: "Besplatna dostava",
	pickup: "Lično preuzimanje",
	sellerShop: "Trgovina",
	sellerPrivate: "Privatno lice",
	sellerSince: (provider: string, year: number) => `Na ${provider}-u od ${year}`,
	views: (n: number) => `${n} ${plural(n, { one: "pregled", few: "pregleda", other: "pregleda" })}`,
	loadFailed: "Detalji se nisu učitali.",
	copyLink: "Kopiraj link",
	linkCopied: "Link kopiran",
	loadingLabel: "Učitavam detalje",
} as const;
