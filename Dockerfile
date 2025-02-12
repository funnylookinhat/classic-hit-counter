FROM denoland/deno:ubuntu

RUN mkdir /data && chown deno:deno /data

WORKDIR /app
USER deno

COPY deno.json deno.lock ./
RUN deno install

COPY assets/ assets/
COPY src/ src/

CMD ["deno", "task", "server"]
