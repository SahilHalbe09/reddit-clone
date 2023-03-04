import { Community, communityState } from "@/src/atoms/communitiesAtom";
import { firestore } from "@/src/firebase/clientApp";
import { doc, getDoc } from "firebase/firestore";
import { GetServerSidePropsContext } from "next";
import safeJsonStringify from "safe-json-stringify";
import React, { useEffect } from "react";
import NotFound from "@/src/components/Community/NotFound";
import Header from "@/src/components/Community/Header";
import PageContent from "@/src/components/Layout/PageContent";
import CreatePostLink from "@/src/components/Community/CreatePostLink";
import Posts from "@/src/components/Posts/Posts";
import { useSetRecoilState } from "recoil";
import About from "@/src/components/Community/About";

type CommuninityPageProps = {
	communityData: Community;
};

const CommuninityPage: React.FC<CommuninityPageProps> = ({ communityData }) => {
	const setCommunityStateValue = useSetRecoilState(communityState);

	useEffect(() => {
		setCommunityStateValue((prev) => ({
			...prev,
			currentCommunity: communityData,
		}));
	}, [communityData]);

	if (!communityData) {
		return <NotFound />;
	}

	return (
		<>
			<Header communityData={communityData} />
			<PageContent>
				<>
					<CreatePostLink />
					<Posts communityData={communityData} />
				</>
				<>
					<About communityData={communityData} />
				</>
			</PageContent>
		</>
	);
};

export async function getServerSideProps(context: GetServerSidePropsContext) {
	// Get Community data & pass it to client
	try {
		const communityDocRef = doc(firestore, "communities", context.query.communityId as string);

		const communityDoc = await getDoc(communityDocRef);

		return {
			props: {
				communityData: communityDoc.exists() ? JSON.parse(safeJsonStringify({ id: communityDoc.id, ...communityDoc.data() })) : "",
			},
		};
	} catch (error) {
		console.log("getServerSideProps erroe", error);
	}
}

export default CommuninityPage;
