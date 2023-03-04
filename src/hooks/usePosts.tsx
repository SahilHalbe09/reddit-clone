import { collection, deleteDoc, doc, getDocs, query, where, writeBatch } from "firebase/firestore";
import { deleteObject, ref } from "firebase/storage";
import { useRouter } from "next/router";
import React, { useEffect } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import { useRecoilState, useRecoilValue, useSetRecoilState } from "recoil";
import { sortAndDeduplicateDiagnostics } from "typescript";
import { authModalState } from "../atoms/authModalAtom";
import { communityState } from "../atoms/communitiesAtom";
import { Post, PostState, PostVote } from "../atoms/postsAtom";
import { auth, firestore, storage } from "../firebase/clientApp";

const usePosts = () => {
	const [user] = useAuthState(auth);

	const router = useRouter();

	const [postStateValue, setPostStateValue] = useRecoilState(PostState);

	const currentCommunity = useRecoilValue(communityState);

	const setAuthModalState = useSetRecoilState(authModalState);

	const onVote = async (event: React.MouseEvent<SVGElement, MouseEvent>, post: Post, vote: number, communityId: string) => {
		event.stopPropagation();

		// Upvote or downvote?
		// Voted before?
		// Opposite(downvote => upvote) or removing vote if upvoted/downvoted already?

		// check for user => if not, open auth modal
		if (!user?.uid) {
			setAuthModalState({ open: true, view: "login" });
		}

		const { voteStatus } = post;

		const existingVote = postStateValue.postVotes.find((vote) => vote.postId === post.id);

		try {
			const batch = writeBatch(firestore);

			const updatedPost = { ...post };
			const updatedPosts = [...postStateValue.posts];
			let updatedPostVotes = [...postStateValue.postVotes];

			let voteChange = vote;

			// new vote
			if (!existingVote) {
				// create a new postVote document
				const postVoteRef = doc(collection(firestore, "users", `${user?.uid}/postVotes`));

				const newVote: PostVote = {
					id: postVoteRef.id,
					postId: post.id,
					communityId,
					voteValue: vote, // 1 or -1
				};

				console.log("New vote!!", newVote);

				batch.set(postVoteRef, newVote);

				// add/subtract 1 to/from post.voteStatus
				updatedPost.voteStatus = voteStatus + vote;
				updatedPostVotes = [...updatedPostVotes, newVote];
			}

			// Existing vote - they have voted on post before?
			else {
				const postVoteRef = doc(firestore, "users", `${user?.uid}/postVotes/${existingVote.id}`);

				// Removing vote (up => neutral OR down => neutral)

				if (existingVote.voteValue === vote) {
					// add/subtract 1 to/from post.voteStatus
					updatedPost.voteStatus = voteStatus - vote;

					updatedPostVotes = updatedPostVotes.filter((vote) => vote.id !== existingVote.id);

					// delete the postVote document
					batch.delete(postVoteRef);

					voteChange *= -1;
				}

				// Flipping vote (up => down OR down => up)
				else {
					// add/subtract 2 to/from post.voteStatus
					updatedPost.voteStatus = voteStatus + 2 * vote;

					const voteIndex = postStateValue.postVotes.findIndex((vote) => vote.id === existingVote.id);

					updatedPostVotes[voteIndex] = {
						...existingVote,
						voteValue: vote,
					};

					// Vote was found - findIndex returns -1 if not found (Check this also)
					// if (voteIndex !== -1) {
					// 	updatedPostVotes[voteIndex] = {
					// 		...existingVote,
					// 		voteValue: vote,
					// 	};
					// }

					// update existing postVote document
					batch.update(postVoteRef, {
						voteValue: vote,
					});

					voteChange = 2 * vote;
				}
			}

			// update post document
			const postRef = doc(firestore, "posts", post.id!);

			batch.update(postRef, { voteStatus: voteStatus + voteChange });

			await batch.commit();

			// Logic 1

			// let updatedState = { ...postStateValue, postVotes: updatedPostVotes };

			// updatedState = {
			// 	...updatedState,
			// 	posts: updatedPosts,
			// };

			// if (updatedState.selectedPost) {
			// 	updatedState = {
			// 		...updatedState,
			// 		selectedPost: updatedPost,
			// 	};
			// }

			// Optimistically update the UI, IDK Changed
			// setPostStateValue(updatedState);

			// Logic 2

			// update state with updated values
			const postIndex = postStateValue.posts.findIndex((item) => item.id === post.id);

			updatedPosts[postIndex!] = updatedPost;

			setPostStateValue((prev) => ({
				...prev,
				posts: updatedPosts, // something maybe wrong
				postVotes: updatedPostVotes,
			}));

			if (postStateValue.selectedPost) {
				setPostStateValue((prev) => ({
					...prev,
					selectedPost: updatedPost,
				}));
			}
		} catch (error) {
			console.log("onVote error: ", error);
		}
	};

	const onSelectPost = async (post: Post) => {
		setPostStateValue((prev) => ({
			...prev,
			selectesdPost: post,
		}));

		router.push(`/r/${post.communityId}/comments/${post.id}`);
	};

	const onDeletePost = async (post: Post): Promise<boolean> => {
		try {
			// check for image, delete if exists
			if (post.imageURL) {
				const imageRef = ref(storage, `posts/${post.id}/image`);

				await deleteObject(imageRef);
			}

			// delete the post document from firestore
			const postDocref = doc(firestore, "posts", post.id!);

			await deleteDoc(postDocref);

			// update recoil state
			setPostStateValue((prev) => ({
				...prev,
				posts: prev.posts.filter((item) => item.id !== post.id),
			}));

			return true;
		} catch (error) {
			return false;
		}
	};

	const getCommunityPostVotes = async (commuunityId: string) => {
		const postVotesQuery = query(collection(firestore, "users", `${user?.uid}/postVotes`), where("communityId", "==", commuunityId));

		const postVoteDocs = await getDocs(postVotesQuery);

		const postVotes = postVoteDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

		setPostStateValue((prev) => ({
			...prev,
			postVotes: postVotes as PostVote[],
		}));
	};

	useEffect(() => {
		if (!user || !currentCommunity.currentCommunity?.id) return;

		getCommunityPostVotes(currentCommunity.currentCommunity?.id);
	}, [user, currentCommunity]);

	useEffect(() => {
		if (!user) {
			// clear user post votes
			setPostStateValue((prev) => ({
				...prev,
				postVotes: [],
			}));
		}
	}, [user]);

	return {
		postStateValue,
		setPostStateValue,
		onVote,
		onSelectPost,
		onDeletePost,
	};
};
export default usePosts;
