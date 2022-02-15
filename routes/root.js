const http = require("http");
const { Resolver } = require("dns").promises;
const recursive = new Resolver();
const root = new Resolver();
const CacheableLookup = require("cacheable-lookup");
const config = require("../config.json");
const cacheable = new CacheableLookup();
const fs = require("fs");
cacheable.install(http.globalAgent);
let mainPortal = config.siaPortals[0];

cacheable.servers = config.nameservers;
recursive.setServers(config.nameservers);
root.setServers([config.rootNameserver]);
// dns.setServers(config.nameservers);
let path = require("path");
setInterval(async () => {
	mainPortal = await getAlivePortal();
}, 100000);
module.exports = async function (fastify, opts) {
	fastify.addContentTypeParser(
		"*",

		function (req, body, done) {
			try {
				done(null, body);
			} catch (error) {
				error.statusCode = 400;
				done(error, undefined);
			}
		}
	);

	fastify.all("*", function (request, reply) {
		(async () => {
			let hostname = request.hostname; //I really need it for debug, don't remove and make PR!!!
			let domainMapArray = Object.keys(config.domainMap);
			domainMapArray.sort((a, b) => b.length - a.length);
			let targetDomain = domainMapArray.find((domain) =>
				hostname.endsWith(domain)
			);
			if (!hostname || !targetDomain) {
				return reply.redirect(301, require("../config.json").rootRedirect);
			}
			let hnsName =
				hostname.slice(0, hostname.length - targetDomain.length) + //"-1" means remove "."
				config.domainMap[targetDomain];

			if (hnsName == "") {
				if (config.defaultDomain) {
					hnsName = config.defaultDomain;
				} else {
					return reply.redirect(301, require("../config.json").rootRedirect);
				}
			}
			let headers = request.headers;

			delete headers.host;
			if (config.siaNative) {
				try {
					let rootTxtRecords = root.resolveTxt(hnsName);
					if (rootTxtRecords.length < 0) {
						throw "No records";
					} else {
						console.log(rootTxtRecords);
					}
				} catch (e) {
					recursive
						.resolveTxt("_contenthash." + hnsName)
						.then((records) => {
							if (records.length < 1) {
								processNormally(hnsName, headers, request, reply);
							} else {
								let siaRecord = records[0][0];
								if (!siaRecord || !siaRecord.startsWith("sia://")) {
									processNormally(hnsName, headers, request, reply);
								} else {
									processSia(siaRecord, request, reply);
								}
							}
						})
						.catch((err) => {
							processNormally(hnsName, headers, request, reply);
							return;
						});
				}
			} else {
				processNormally(hnsName, headers, request, reply);
			}
		})();
	});
};
function processNormally(hnsName, headers, request, reply) {
	try {
		let resource = http.request(
			{
				hostname: hnsName,
				headers: headers,
				lookup: cacheable.lookup,

				method: request.method,
				path: request.url,
			},
			(res) => {
				reply.raw.writeHead(res.statusCode, res.headers);

				res.on("data", (data) => {
					reply.raw.write(data);
				});
				res.on("end", () => {
					reply.raw.end();
				});
			}
		);

		resource.once("error", () => {
			return reply.redirect(302, "https://www.namebase.io/domains/" + hnsName);
		});
		if (["PUT", "PATCH", "POST"].includes(request.method)) {
			resource.write(request.body);
		}
		resource.end();
	} catch (error) {
		return reply.redirect(302, "https://www.namebase.io/domains/" + hnsName);
	}
}

async function processSia(siaLink, request, reply) {
	const fetch = (await import("node-fetch")).default;
	try {
		let resource = await fetch(
			mainPortal + siaLink.slice("sia://".length) + request.url,
			{ headers: { "User-agent": "Sia-Agent" } }
		);

		reply.raw.writeHead(resource.status, resource.headers);
		resource.body.pipe(reply.raw);
	} catch (error) {
		console.log(error);
		return;
	}
}
async function getAlivePortal() {
	const fetch = (await import("node-fetch")).default;
	return new Promise(async (resolve, reject) => {
		let found = false;
		config.siaPortals.forEach((portal, index) => {
			setTimeout(async () => {
				if (found) {
					return;
				} else {
					try {
						let resource = await (
							await fetch(
								portal + "AACo6KGldohjcBP39JUxFEWWMwiTTV_wQfrd5z28gUoYxA",
								{
									headers: {
										"User-agent": "Sia-Agent",
									},
								}
							)
						).text();
						if (resource == "test") {
							found = true;
							resolve(portal);
						} else {
							return;
						}
					} catch (e) {
						return;
					}
				}
			}, index * 200);
		});
	});
}
