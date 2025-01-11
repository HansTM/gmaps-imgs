/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.toml`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { googleDomains, indexHtml } from "./data.js"

const getFullImageUrl = (imageUrl: string) => {
	return imageUrl.replace(/=.+$/, '=s0')
}

const redirectToFullImage = async (mapsUrl: URL) => {
	if (mapsUrl.host === 'maps.app.goo.gl') {
		const mapsRequest = await fetch(mapsUrl)
		const mapsResult = await mapsRequest.text()
		const imageUrlRegex = /<meta content="(http[^"]+)".+?image.+?>/
		let foundImageUrl = mapsResult.match(imageUrlRegex)?.[1]
		if (foundImageUrl) {
			return Response.redirect(getFullImageUrl(foundImageUrl))
		}
	}

	if (mapsUrl.host.startsWith('googleusercontent.com')) {
		return Response.redirect(getFullImageUrl(mapsUrl.toString()))
	}
	
	const foundImageId = mapsUrl.toString().match(/!1s([^!]+)!/)?.[1]
	if (foundImageId) {
		return Response.redirect(`https://lh5.googleusercontent.com/p/${foundImageId}=s0`)
	}
	
	return new Response("Not found", {
		status: 404
	})
}

const returnLandingPage = async () => {
	return new Response(indexHtml, {
		headers: {
			"content-type": "text/html;charset=UTF-8",
		},
	})
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		const { method, url, headers } = request

		const mapsUrlRaw = new URL(url).searchParams.get("url")

		if (mapsUrlRaw) {
			const mapsUrl = new URL(mapsUrlRaw)
			if (
				mapsUrl.host === 'maps.app.goo.gl' || 
				mapsUrl.host === 'maps.google.com' || 
				(googleDomains.filter(a => mapsUrl.host.endsWith(a)).length && mapsUrl.pathname.startsWith('/maps/')) ||
				mapsUrl.host.startsWith('googleusercontent.com')
			) {
				return redirectToFullImage(mapsUrl)
			} else {
				return new Response("URL not allowed.", {
					status: 400
				})
			}
		}

		return await returnLandingPage()
	},
} satisfies ExportedHandler<Env>


