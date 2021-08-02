<?php

namespace SV\DynamicThreadDescription\XF\ControllerPlugin;



/**
 * Extends \XF\ControllerPlugin\Thread
 */
class Thread extends XFCP_Thread
{
    /**
     * Replace the entire function to add a ?post=<post_id> argument
     *
     * @param \XF\Entity\Post $post
     * @return string
     * @noinspection PhpMissingReturnTypeInspection
     */
    public function getPostLink(\XF\Entity\Post $post)
    {
        $thread = $post->Thread;
        if (!$thread)
        {
            throw new \LogicException("Post has no thread");
        }

        $page = floor($post->position / $this->options()->messagesPerPage) + 1;
        $params = ['page' => $page];
        $params['post'] = $post->post_id;

        $typeHandler = $thread->TypeHandler;
        $isFirstPostAndPinned = $post->isFirstPost() && $typeHandler->isFirstPostPinned($thread);

        // If the default order is something else, we need to force date ordering as otherwise we can't
        // realistically find the post. Plus when requesting a specific post, we generally are assuming
        // the result will be date ordered. We can bypass this for the first post if it's pinned, as
        // we know we'll see it on page 1.
        if ($typeHandler->getDefaultPostListOrder($thread) != 'post_date' && !$isFirstPostAndPinned)
        {
            $params['order'] = 'post_date';
        }

        return $this->buildLink('threads', $thread, $params) . '#post-' . $post->post_id;
    }
}