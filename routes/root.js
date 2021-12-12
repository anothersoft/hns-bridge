const http = require("http");
// const dns = require("hdns");
const resolver = new dns.Resolver();

const CacheableLookup = require("cacheable-lookup");
const config = require("../config.json");
const cacheable = new CacheableLookup();
const fs = require("fs");
cacheable.install(http.globalAgent);
cacheable.servers = config.nameservers;
// dns.setServers(config.nameservers);
let path = require("path");
let analyticsEnabled = fs.existsSync(
	path.join(__dirname, "../../analytics.json")
);
let analytics;
if (analyticsEnabled) {
	analytics = JSON.parse(
		fs.readFileSync(path.join(__dirname, "../../analytics.json"), "utf8")
	);
	setInterval(() => {
		fs.writeFileSync(
			path.join(__dirname, "../../analytics.json"),
			JSON.stringify(analytics)
		);
	}, 60000);
}
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

	fastify.all("*", async function (request, reply) {
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
			if (request.url == "/analytics") {
				if (analyticsEnabled) {
					let overallTraffic = Object.values(analytics).reduce(
						(pv, cv) => pv + cv,
						0
					);
					return `Overall traffic through this bridge: ` + overallTraffic;
				} else {
					return { error: "Analytics disabled" };
				}
			}
			if (request.url == "/analyticsFullJson") {
				if (analyticsEnabled) {
					return analytics;
				} else {
					return { error: "Analytics disabled" };
				}
			}
			return reply.redirect(301, require("../config.json").rootRedirect);
		}
		let headers = request.headers;
		// console.log(
		// 	// cacheable.resolveNs("")
		// 	cacheable.resolveNs("serverrq.", {}, (err, addr) => {
		// 		console.log(addr);
		// 	})
		// );

		delete headers.host;
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
						if (analyticsEnabled) {
							if (analytics[hostname]) {
								analytics[hostname]++;
							} else {
								analytics[hostname] = 1;
							}
						}
					});
				}
			);

			resource.once("error", () => {
				return reply.redirect(
					302,
					"https://www.namebase.io/domains/" + hnsName
				);
			});
			if (["PUT", "PATCH", "POST"].includes(request.method)) {
				resource.write(request.body);
			}
			resource.end();
		} catch (error) {
			return reply.redirect(302, "https://www.namebase.io/domains/" + hnsName);
		}
	});
};
