// Import `extendTheme`
import { extendTheme } from "@chakra-ui/react";
import { Button } from "./button";

// Inport Fonts
import "@fontsource/open-sans/300.css";
import "@fontsource/open-sans/400.css";
import "@fontsource/open-sans/700.css";

// Call `extendTheme` and pass your custom values
export const theme = extendTheme({
	colors: {
		brand: {
			100: "#ff3c00",
		},
	},
	fonts: {
		bosy: "open-sans, sans-serif",
	},
	styles: {
		global: () => ({
			body: {
				bg: "gray.200",
			},
		}),
	},

	components: { Button },
});
