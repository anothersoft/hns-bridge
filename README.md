# Shaked HNS bridge

A "quick and dirty" open source alternative to hns.to

![](https://forthebadge.com/images/badges/powered-by-black-magic.svg)

## How to use?

If you want to access [handshake](https://handshake.org) domain, but don't want to install additional software - you're welcome!
Just type ``<handshake-domain>.hns.is`` in your browser page, and done! You're browsing handshake website!

## Wanna get own bridge for your staked domain?

DM me on twitter, [@angrymouse_hns](https://twitter.com/angrymouse_hns)

## How to support developer?

My handshake address is ``hs1ql2pfxgenmvmzaffkf7nk6y4f65nwl37z9z0fad``, you can donate some HNS if you liked my development.
Also you can buy one of my domains: [cbro/](https://www.namebase.io/domains/cbro), [веб-страница/](https://www.namebase.io/domains/xn----8sbabesy3bzajl6c), [🔴💩/](https://www.namebase.io/domains/xn--ls8hvi), [💩🔴/](https://www.namebase.io/domains/xn--ls8hwi)

Thanks everyone who supports me! I need your money-support because I need to run the "main" mirror of this project (shaked.xyz itself)

## How to deploy your own bridge?

Easy! Just clone this repo, then go to the project directory, then type ``npm install`` in command line, then edit config.json as you like, point a domain to your IP, and enjoy!

## Docker

First, clone [handshake-org/hnsd](https://github.com/handshake-org/hnsd). 
Follow the docker instructions in the readme.md, but use the following create command instead:
```bash
docker create \
  --name=hnsd \
  --publish=127.0.0.1:53:53/udp \
  --publish=127.0.0.1:5369:5369/udp \
  --restart=unless-stopped \
  hnsd -r 0.0.0.0:53
```

Run the hnsd container like you normally would. 
While the node is syncing, clone this repo and edit the config.json to your likings.

Build the image:
```bash
docker build -t hns-bridge .
```

Run the container: 
```bash
docker run -d -p 0.0.0.0:80:80 -t hns-bridge
```

At last, point the ``@`` and ``*`` CNAME records on your domain's nameservers, to your server's IP and enjoy! Have a beautiful time!


# Thanks!
> Here are the people/projects/organizations that I want to thank for supporting the project (and me):

Great thanks to [HandyHost](https://handyhost.computer)

### **[Kindly sponsored & supported by <img src="https://handyhost.computer/static/media/logo.2302906c.svg" alt="drawing" width="100"/>](https://handyhost.computer)**




Thanks to [*phillippe/*](https://phillippe.hns.is) for hns.is domain!

Thanks to [**c0n0r/**](https://c0n0r.hns.is) for buying my domains in large amounts.

Also thanks for [**tiMaxal/**](https://timaxal.hns.is) for buying all of my cheap domains!

And [@HNSOSS](https://twitter.com/HNSOSS) for giving grants and supporting all developers of HNS ecosystem!

And [Inner I Net Company/](https://innerinetcompany.com) for donations!

And [ecosysmaat.eth](https://ecosysmaat.eth.link/) for donations and just being nice!
