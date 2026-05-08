FROM nginx:1.25-alpine
 
RUN rm -rf /usr/share/nginx/html/*
COPY index.html /usr/share/nginx/html/index.html
COPY app.js /usr/share/nginx/html/app.js
COPY styles.css /usr/share/nginx/html/styles.css
 
EXPOSE 80
 
CMD ["nginx", "-g", "daemon off;"]