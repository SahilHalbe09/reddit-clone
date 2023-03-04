import { communityState } from "@/src/atoms/communitiesAtom";
import About from "@/src/components/Community/About";
import PageContentLayout from "@/src/components/Layout/PageContent";
import NewPostForm from "@/src/components/Posts/NewPostForm";
import { auth } from "@/src/firebase/clientApp";
import useCommunityData from "@/src/hooks/useCommunityData";
import { Box, Text } from "@chakra-ui/react";
import React from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilValue } from "recoil";

const submitPostPage: React.FC = () => {
	// eslint-disable-next-line react-hooks/rules-of-hooks
	const [user] = useAuthState(auth);

	// eslint-disable-next-line react-hooks/rules-of-hooks
	const { communityStateValue } = useCommunityData();

	// eslint-disable-next-line react-hooks/rules-of-hooks
	const setCommunityStateValue = useRecoilValue(communityState);

	console.log("COMMUNITY:", setCommunityStateValue);

	return (
		<PageContentLayout maxWidth="1060px">
			<>
				<Box p="14px 0px" borderBottom="1px solid" borderColor="white">
					<Text>Create a post</Text>
				</Box>
				{user && <NewPostForm user={user} communityImageURL={communityStateValue.currentCommunity?.imageURL} />}
			</>
			<>{communityStateValue.currentCommunity && <About communityData={communityStateValue.currentCommunity} />}</>
		</PageContentLayout>
	);
};
export default submitPostPage;
