import { Post, PostState } from "@/src/atoms/postsAtom";
import { firestore } from "@/src/firebase/clientApp";
import { Box, Flex, SkeletonCircle, SkeletonText, Stack, Text } from "@chakra-ui/react";
import { log } from "console";
import { User } from "firebase/auth";
import { collection, doc, getDoc, getDocs, increment, orderBy, query, serverTimestamp, Timestamp, where, writeBatch } from "firebase/firestore";
import React, { useEffect, useState } from "react";
import { useSetRecoilState } from "recoil";
import CommentInput from "./CommentInput";
import CommentItem, { Comment } from "./CommentItem";

type CommentsProps = {
	user: User;
	selectedPosts: Post | null;
	communityId: string;
};

const Comments: React.FC<CommentsProps> = ({ user, selectedPosts, communityId }) => {
	const [commentText, setCommentText] = useState("");
	const [comments, setComments] = useState<Comment[]>([]);
	const [fetchLoading, setFetchLoading] = useState(true);
	const [createLoading, setCreateLoading] = useState(false);
	const [loadingDeleteId, setLoadingDeleteId] = useState("");
	const setPostState = useSetRecoilState(PostState);

	const onCreateComment = async () => {
		setCreateLoading(true);

		try {
			const batch = writeBatch(firestore);

			// create comment document
			const commnetDocRef = doc(collection(firestore, "comments"));

			const newComment: Comment = {
				id: commnetDocRef.id,
				creatorId: user.uid,
				creatorDisplayText: user.email!.split("@")[0],
				communityId,
				postId: selectedPosts?.id!,
				postTitle: selectedPosts?.title!,
				text: commentText,
				createdAt: serverTimestamp() as Timestamp,
			};

			batch.set(commnetDocRef, newComment);

			newComment.createdAt = { seconds: Date.now() / 1000 } as Timestamp;

			// update post numberOfComments +1
			const postDocRef = doc(firestore, "posts", selectedPosts?.id!);

			batch.update(postDocRef, {
				numberOfComments: increment(1),
			});

			await batch.commit();

			// update client recoil state
			setCommentText("");

			setComments((prev) => [newComment, ...prev]);

			setPostState((prev) => ({
				...prev,
				selectedPost: {
					...prev.selectedPost,
					numberOfComments: prev.selectedPost?.numberOfComments! + 1,
				} as Post,
				postUpdateRequired: true,
			}));
		} catch (error) {
			console.log("onCreateComment error: ", error);
		}

		setCreateLoading(false);
	};

	const onDeleteComment = async (comment: Comment) => {
		setLoadingDeleteId(comment.id);

		try {
			const batch = writeBatch(firestore);

			// delete comment document
			const commentDocRef = doc(firestore, "comments", comment.id);
			batch.delete(commentDocRef);

			// update post numberOfComments -1
			const postDocRef = doc(firestore, "posts", selectedPosts?.id!);
			batch.update(postDocRef, {
				numberOfCommnets: increment(-1),
			});

			await batch.commit();

			// update client recoil state
			setPostState((prev) => ({
				...prev,
				selectedPost: {
					...prev.selectedPost,
					numberOfCommnets: prev.selectedPost?.numberOfComments! - 1,
				} as Post,
			}));

			setComments((prev) => prev.filter((item) => item.id !== comment.id));
		} catch (error) {
			console.log("onDeleteComment error: ", error);
		}

		setLoadingDeleteId("");
	};

	const getPostComments = async () => {
		try {
			const commentsQuery = query(collection(firestore, "comments"), where("postId", "==", selectedPosts?.id), orderBy("createdAt", "desc"));

			const commentDocs = await getDocs(commentsQuery);

			const comments = commentDocs.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

			setComments(comments as Comment[]);
		} catch (error) {
			console.log("getPostComments error: ", error);
		}

		setFetchLoading(false);
	};

	useEffect(() => {
		if (!selectedPosts) return;

		getPostComments();
	}, [selectedPosts]);

	return (
		<Box bg="white" borderRadius="0px 0px 4px 4px" p={2}>
			<Flex direction="column" pl={10} pr={4} mb={6} fontSize="10pt" width="100%">
				{!fetchLoading && <CommentInput comment={commentText} setComment={setCommentText} user={user} loading={createLoading} onCreateComment={onCreateComment} />}{" "}
			</Flex>
			<Stack spacing={6} p={2}>
				{fetchLoading ? (
					<>
						{[0, 1, 2].map((item) => (
							<Box key={item} padding="6" bg="white">
								<SkeletonCircle size="10" />
								<SkeletonText mt="4" noOfLines={2} spacing="4" />
							</Box>
						))}
					</>
				) : (
					<>
						{comments.length === 0 ? (
							<Flex direction="column" justify="center" align="center" borderTop="1px solid" borderColor="gray.100" p={20}>
								<Text fontWeight={700} opacity={0.3}>
									No Comments Yet
								</Text>
							</Flex>
						) : (
							<>
								{comments.map((comment) => (
									<CommentItem comment={comment} onDeleteComment={onDeleteComment} loadingDelete={loadingDeleteId === comment.id} userId={user.uid} key={comment.id} />
								))}
							</>
						)}
					</>
				)}
			</Stack>
		</Box>
	);
};
export default Comments;
