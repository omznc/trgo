import { expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { Markdown } from "./markdown";

test("a listing ref goes to renderRef, and a link stays a link", () => {
	const html = renderToStaticMarkup(
		<Markdown text="**Sofa, 830 KM** [olx:33083772] and [site](https://olx.ba/x)" renderRef={(r) => <i>{r}</i>} />,
	);
	expect(html).toContain("<i>olx:33083772</i>");
	expect(html).toContain('href="https://olx.ba/x"');
});

test("without renderRef the ref stays plain text", () => {
	expect(renderToStaticMarkup(<Markdown text="see [olx:1]" />)).toContain("see [olx:1]");
});
