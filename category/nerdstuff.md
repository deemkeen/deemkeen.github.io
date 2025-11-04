---
layout: page
title: Nerdstuff
permalink: /category/nerdstuff/
---

<ul>
{% for post in site.categories.nerdstuff %}
  <li>
    <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
  </li>
{% endfor %}
</ul>
