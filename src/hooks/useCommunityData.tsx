import { collection, doc, getDoc, getDocs, increment, writeBatch } from "firebase/firestore";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState, useSetRecoilState } from "recoil";
import { authModalState } from "../atoms/authModalAtom";
import { Community, CommunitySnippet, communityState } from "../atoms/communitiesAtom";
import { auth, firestore } from "../firebase/clientApp";

const useCommunityData = () => {
	const [user] = useAuthState(auth);
	const [communityStateValue, setCommunityStateValue] = useRecoilState(communityState);
	const setAuthModalState = useSetRecoilState(authModalState);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState("");
	const router = useRouter();

	const onJoinOrLeaveCommunity = (communityData: Community, isJoined?: boolean) => {
		console.log("ON JOIN LEAVE", communityData.id);

		if (!user) {
			setAuthModalState({ open: true, view: "login" });
			return;
		}

		// is user signed in?
		if (isJoined) {
			leaveCommunity(communityData.id);
			return;
		}

		joinCommunity(communityData);

		// if not, onpen auth modal
	};

	const getMySnippets = async () => {
		setLoading(true);
		try {
			// get users snippets
			const snippetDocs = await getDocs(collection(firestore, `users/${user?.uid}/communitySnippets`));

			const snippets = snippetDocs.docs.map((doc) => ({ ...doc.data() }));

			setCommunityStateValue((prev) => ({
				...prev,
				mySnippets: snippets as CommunitySnippet[],
				snippetsFetched: true,
			}));
		} catch (error: any) {
			console.log("getMySnippets error", error);
			setError(error.message);
		}
		setLoading(false);
	};

	const joinCommunity = async (communityData: Community) => {
		setLoading(true);

		console.log("JOINING COMMUNITY: ", communityData.id);

		// Batch writes
		try {
			// create a new community snippet
			const batch = writeBatch(firestore);

			const newSnippet: CommunitySnippet = {
				communityId: communityData.id,
				imageURL: communityData.imageURL || "",
				isModerator: user?.uid === communityData.creatorId,
			};

			batch.set(doc(firestore, `users/${user?.uid}/communitySnippets`, communityData.id), newSnippet);

			// updating numberOfMembers
			batch.update(doc(firestore, "communities", communityData.id), {
				numberOfMembers: increment(1),
			});

			await batch.commit();

			// Add current community to snippet
			setCommunityStateValue((prev) => ({
				...prev,
				mySnippets: [...prev.mySnippets, newSnippet],
			}));
		} catch (error: any) {
			console.log("joinCommunity error", error);
			setError(error.message);
		}

		setLoading(false);
	};

	const leaveCommunity = async (communityId: string) => {
		setLoading(true);

		try {
			// Batch writes
			const batch = writeBatch(firestore);

			// deleting a community snippet from user
			batch.delete(doc(firestore, `users/${user?.uid}/communitySnippets/${communityId}`));

			// updating numberOfMembers
			batch.update(doc(firestore, "communities", communityId), {
				numberOfMembers: increment(-1),
			});

			await batch.commit();

			// update recoil state
			setCommunityStateValue((prev) => ({
				...prev,
				mySnippets: prev.mySnippets.filter((item) => item.communityId !== communityId),
			}));
		} catch (error: any) {
			console.log("leaveCommunity error", error);
			setError(error.message);
		}

		setLoading(false);
	};

	const getCommunityData = async (communityId: string) => {
		try {
			const communityDocRef = doc(firestore, "communities", communityId as string);

			const communityDoc = await getDoc(communityDocRef);

			setCommunityStateValue((prev) => ({
				...prev,
				currentCommunity: { id: communityDoc.id, ...communityDoc.data() } as Community,
			}));
		} catch (error) {
			console.log("getCommunityData", error);
		}
	};

	useEffect(() => {
		if (!user) {
			setCommunityStateValue((prev) => ({
				...prev,
				mySnippets: [],
				snippetsFetched: false,
			}));

			return;
		}

		getMySnippets();
	}, [user]);

	useEffect(() => {
		const { communityId } = router.query;

		if (communityId && !communityStateValue.currentCommunity) {
			getCommunityData(communityId as string);
		}
	}, [router.query, communityStateValue.currentCommunity]);

	return {
		// data and functions
		communityStateValue,
		onJoinOrLeaveCommunity,
		loading,
	};
};

export default useCommunityData;
function setAuthModalState(arg0: { open: boolean; view: string }) {
	throw new Error("Function not implemented.");
}
