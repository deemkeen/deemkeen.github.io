---
layout: page
title: linux
permalink: /category/linux/
---

<ul>
{% for post in site.categories.linux %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </li>
{% endfor %}
</ul>
