FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS base
WORKDIR /app
EXPOSE 80
EXPOSE 8000

FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src
COPY ["MomOi.API/MomOi.API.csproj", "MomOi.API/"]
RUN dotnet restore "MomOi.API/MomOi.API.csproj"
COPY . .
WORKDIR "/src/MomOi.API"
RUN dotnet build "MomOi.API.csproj" -c Release -o /app/build

FROM build AS publish
RUN dotnet publish "MomOi.API.csproj" -c Release -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
ENV ASPNETCORE_URLS=http://+:80
ENTRYPOINT ["dotnet", "MomOi.API.dll"]
