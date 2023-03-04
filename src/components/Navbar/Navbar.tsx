import { auth } from "@/src/firebase/clientApp";
import useDirectory from "@/src/hooks/useDirectory";
import { Flex, Image } from "@chakra-ui/react";
import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import Directory from "./Directory/Directory";
import RightContent from "./RightContent/RightContent";
import SearchInput from "./SearchInput";
import { defaultMenuItem } from "@/src/atoms/directoryMenuAtom";

const Navbar: React.FC = () => {
	const [user, loading, error] = useAuthState(auth);

	const { onSelectMenuItem } = useDirectory();

	return (
		<Flex bg="white" height="44px" padding="6px 12px" justify={{ md: "space-between" }}>
			<Flex align="center" width={{ base: "40px", md: "auto" }} mr={{ base: 0, md: 2 }} cursor="pointer" onClick={() => onSelectMenuItem(defaultMenuItem)}>
				<Image src="/images/redditFace.svg" height="30px" alt="reddit-face" />
				<Image src="/images/redditText.svg" height="46px" display={{ base: "none", md: "unset" }} alt="reddit-text" />
			</Flex>
			{user && <Directory />}
			<SearchInput user={user} />
			<RightContent user={user} />
		</Flex>
	);
};
export default Navbar;
