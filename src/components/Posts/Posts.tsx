import { Community } from "@/src/atoms/communitiesAtom";
import { Post } from "@/src/atoms/postsAtom";
import { auth, firestore } from "@/src/firebase/clientApp";
import usePosts from "@/src/hooks/usePosts";
import { Stack } from "@chakra-ui/react";
import { async } from "@firebase/util";
import { collection, getDocs, orderBy, query, where } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useAuthState } from "react-firebase-hooks/auth";
import PostItem from "./PostItem";
import PostLoader from "./PostLoader";

type PostsProps = {
	communityData: Community;
};

const Posts: React.FC<PostsProps> = ({ communityData }) => {
	const [user] = useAuthState(auth);
	const [loading, setLoading] = useState(false);
	const { postStateValue, setPostStateValue, onVote, onSelectPost, onDeletePost } = usePosts();

	const getPosts = async () => {
		try {
			setLoading(true);

			// Get posts for current community
			const postsQuery = query(collection(firestore, "posts"), where("communityId", "==", communityData.id), orderBy("createdAt", "desc"));

			const postDocs = await getDocs(postsQuery);

			// Store in post state
			const posts = postDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

			setPostStateValue((prev) => ({
				...prev,
				posts: posts as Post[],
			}));

			console.log("posts", posts);
		} catch (error: any) {
			console.log("getPosts error", error.message);
		}

		setLoading(false);
	};

	useEffect(() => {
		getPosts();
	}, [communityData]);

	return (
		<>
			{loading ? (
				<PostLoader />
			) : (
				<Stack>
					{postStateValue.posts.map((item) => (
						<PostItem
							post={item}
							key={item.id}
							userIsCreator={user?.uid === item.creatorId}
							userVoteValue={postStateValue.postVotes.find((vote) => vote.postId === item.id)?.voteValue}
							onVote={onVote}
							onSelectPost={onSelectPost}
							onDeletePost={onDeletePost}
						/>
					))}
				</Stack>
			)}
		</>
	);
};
export default Posts;
