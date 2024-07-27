<?php
/**
 * @noinspection PhpMissingReturnTypeInspection
 * @noinspection PhpMultipleClassDeclarationsInspection
 */

namespace SV\DynamicThreadDescription\XF\Entity;

/**
 * @Extends \XF\Entity\Post
 */
class Post extends XFCP_Post
{

    public function getLinkToThreadmarkReaderMode(array $extra = [])
    {
        $extra['post'] = $this->post_id;

        return parent::getLinkToThreadmarkReaderMode($extra);
    }
}